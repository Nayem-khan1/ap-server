const fs = require("fs");
const path = require("path");

const MODULE_NAME_MAP = {
  users: "user",
  courses: "course",
  lessons: "lesson",
  "learning-flow": "lesson",
  quiz: "lesson",
  "smart-notes": "lesson",
  enrollments: "enrollment",
  progress: "enrollment",
  payments: "payment",
  coupons: "coupon",
  certificates: "certificate",
  events: "event",
};

const FIELD_ALIASES = {
  coupon: {
    value: "discount_value",
    usage_limit: "max_redemption",
    expiry: "expires_at",
  },
  blog: {
    tags_csv: "tags",
  },
};

const MODULE_FIELD_EXCLUDE = {
  course: ["name", "email", "bio", "avatar", "specialization"],
};

const FIELD_IGNORE = new Set([
  "id",
  "ids",
  "page",
  "page_size",
  "search",
  "sort_by",
  "sort_order",
  "range",
  "params",
  "query",
  "body",
]);

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(read(filePath));
}

function unique(items) {
  return [...new Set(items)];
}

function normalizeModule(moduleName) {
  return MODULE_NAME_MAP[moduleName] || moduleName;
}

function normalizePath(pathValue) {
  if (!pathValue) return "/";
  const value = pathValue.replace(/\/+/g, "/");
  if (value === "/") return "/";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function joinPath(base, child) {
  const normalizedBase = normalizePath(base);
  const normalizedChild = normalizePath(child);
  if (normalizedChild === "/") return normalizedBase;
  if (normalizedBase === "/") return normalizedChild;
  return normalizePath(`${normalizedBase}/${normalizedChild.replace(/^\//, "")}`);
}

function extractObjectFieldsFromSchema(content) {
  const fields = new Set();
  const objectPattern = /\.object\s*\(/g;
  let match = objectPattern.exec(content);
  while (match) {
    const objectIndex = match.index;

    const braceStart = content.indexOf("{", objectIndex);
    if (braceStart === -1) break;

    let depth = 0;
    let cursor = braceStart;
    for (; cursor < content.length; cursor += 1) {
      const char = content[cursor];
      if (char === "{") depth += 1;
      if (char === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    if (depth !== 0) break;

    const body = content.slice(braceStart + 1, cursor);
    for (const keyMatch of body.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm)) {
      const key = keyMatch[1];
      if (!FIELD_IGNORE.has(key)) fields.add(key);
    }

    objectPattern.lastIndex = cursor + 1;
    match = objectPattern.exec(content);
  }
  return [...fields].sort();
}

function collectBackendSchemaFields(serverModulesPath) {
  const fieldMap = new Map();
  const modules = fs
    .readdirSync(serverModulesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const moduleName of modules) {
    const schemaPath = path.join(serverModulesPath, moduleName, "schema.ts");
    if (!fs.existsSync(schemaPath)) continue;
    const content = read(schemaPath);
    fieldMap.set(moduleName, extractObjectFieldsFromSchema(content));
  }
  return fieldMap;
}

function collectFrontendFields(adminMap) {
  const fieldMap = new Map();
  for (const moduleEntry of adminMap.modules || []) {
    const moduleName = normalizeModule(moduleEntry.module);
    const schemaFields = (moduleEntry.zod_schemas || []).flatMap((schema) =>
      (schema.fields || []).map((field) => field.field),
    );
    const formFields = moduleEntry.form_field_names || [];
    const excluded = new Set(MODULE_FIELD_EXCLUDE[moduleName] || []);
    const merged = unique([...(fieldMap.get(moduleName) || []), ...schemaFields, ...formFields])
      .filter((field) => !FIELD_IGNORE.has(field))
      .filter((field) => !excluded.has(field))
      .sort();
    fieldMap.set(moduleName, merged);
  }
  return fieldMap;
}

function fieldExistsWithAlias(moduleName, frontendField, backendFieldSet) {
  if (backendFieldSet.has(frontendField)) return true;
  const aliases = FIELD_ALIASES[moduleName] || {};
  const backendAlias = aliases[frontendField];
  if (backendAlias && backendFieldSet.has(backendAlias)) return true;
  return false;
}

function parseRouterDefinitions(routeFileContent) {
  const routerNames = [...routeFileContent.matchAll(/const\s+([a-zA-Z0-9_]+)\s*=\s*Router\(\)/g)].map(
    (match) => match[1],
  );

  const map = new Map();
  for (const routerName of routerNames) {
    const routes = [];
    const routeRegex = new RegExp(
      `${routerName}\\.(get|post|put|patch|delete)\\(\\s*["']([^"']+)["']`,
      "g",
    );
    for (const match of routeFileContent.matchAll(routeRegex)) {
      routes.push({
        method: match[1].toUpperCase(),
        path: normalizePath(match[2]),
      });
    }
    map.set(routerName, routes);
  }

  return map;
}

function collectBackendAdminEndpoints(srcPath) {
  const modulesPath = path.join(srcPath, "modules");
  const adminRoutePath = path.join(srcPath, "routes", "admin.ts");
  const mounts = [];
  const adminRouteContent = read(adminRoutePath);

  for (const match of adminRouteContent.matchAll(/adminRouter\.use\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_]+)\s*\)/g)) {
    mounts.push({ mountPath: normalizePath(match[1]), routerName: match[2] });
  }

  const routerDefinitions = new Map();
  const routeFiles = [
    ...fs
      .readdirSync(modulesPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(modulesPath, entry.name, "route.ts"))
      .filter((file) => fs.existsSync(file)),
    path.join(modulesPath, "auth", "auth.route.ts"),
  ].filter((file) => fs.existsSync(file));

  for (const filePath of routeFiles) {
    const content = read(filePath);
    const parsed = parseRouterDefinitions(content);
    for (const [routerName, routes] of parsed.entries()) {
      routerDefinitions.set(routerName, routes);
    }
  }

  const endpoints = [];
  for (const mount of mounts) {
    const routes = routerDefinitions.get(mount.routerName) || [];
    for (const route of routes) {
      endpoints.push({
        method: route.method,
        path: normalizePath(joinPath("/api/v1/admin", joinPath(mount.mountPath, route.path))),
      });
    }
  }

  return unique(endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`)).sort();
}

function collectFrontendAdminEndpoints(adminMap) {
  return (adminMap.endpoint_catalog || [])
    .map((entry) => normalizePath(entry.path))
    .filter((item) => item.startsWith("/api/v1/admin"))
    .sort();
}

function evaluateSecurity(repoRoot) {
  const appContent = read(path.join(repoRoot, "server", "src", "app.ts"));
  const authRouteContent = read(path.join(repoRoot, "server", "src", "modules", "auth", "auth.route.ts"));
  const authServiceContent = read(path.join(repoRoot, "server", "src", "modules", "auth", "auth.service.ts"));
  const envContent = read(path.join(repoRoot, "server", "src", "config", "env.ts"));
  const objectIdMiddlewareContent = read(
    path.join(repoRoot, "server", "src", "middlewares", "validate-object-id.middleware.ts"),
  );
  const loggerContent = read(path.join(repoRoot, "server", "src", "config", "logger.ts"));

  const saltDefaultMatch = envContent.match(/BCRYPT_SALT_ROUNDS[\s\S]*?default\((\d+)\)/);
  const saltDefault = saltDefaultMatch ? Number(saltDefaultMatch[1]) : 0;

  return [
    {
      key: "Helmet enabled",
      ok: /app\.use\(helmet\(\)\)/.test(appContent),
    },
    {
      key: "CORS configured",
      ok: /app\.use\(\s*cors\(/s.test(appContent),
    },
    {
      key: "Global rate limiter enabled",
      ok: /const\s+globalLimiter\s*=\s*rateLimit\(/.test(appContent),
    },
    {
      key: "Mongo sanitize enabled",
      ok: /mongoSanitize/.test(appContent),
    },
    {
      key: "XSS sanitizer enabled",
      ok: /xss\(/.test(appContent),
    },
    {
      key: "ObjectId validation middleware",
      ok: /Types\.ObjectId\.isValid/.test(objectIdMiddlewareContent),
    },
    {
      key: "OTP rate limit 5/hour",
      ok: /windowMs:\s*60\s*\*\s*60\s*\*\s*1000/.test(authRouteContent) && /max:\s*5/.test(authRouteContent),
    },
    {
      key: "OTP stored hashed",
      ok: /bcrypt\.hash\(otp/.test(authServiceContent),
    },
    {
      key: "Password salt rounds >= 10",
      ok: saltDefault >= 10,
    },
    {
      key: "Winston logger configured",
      ok: /createLogger/.test(loggerContent),
    },
  ];
}

function generateReport() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const adminMapPath = path.join(repoRoot, "docs", "admin-schema-map.json");
  const serverModulesPath = path.join(repoRoot, "server", "src", "modules");
  const serverSrcPath = path.join(repoRoot, "server", "src");
  const reportPath = path.join(repoRoot, "docs", "integration-check-report.md");

  const adminMap = readJson(adminMapPath);

  const frontendFieldMap = collectFrontendFields(adminMap);
  const backendFieldMap = collectBackendSchemaFields(serverModulesPath);

  const moduleLines = [];
  const missingByModule = [];
  let comparedModules = 0;
  let fullyAlignedModules = 0;

  for (const [moduleName, frontendFields] of frontendFieldMap.entries()) {
    if (!backendFieldMap.has(moduleName)) continue;
    comparedModules += 1;
    const backendFields = backendFieldMap.get(moduleName) || [];
    const backendSet = new Set(backendFields);

    const missing = frontendFields.filter(
      (field) => !fieldExistsWithAlias(moduleName, field, backendSet),
    );

    const frontendAliasTargets = new Set(Object.values(FIELD_ALIASES[moduleName] || {}));
    const extras = backendFields.filter(
      (field) => !frontendFields.includes(field) && !frontendAliasTargets.has(field),
    );

    if (missing.length === 0) {
      fullyAlignedModules += 1;
    } else {
      missingByModule.push({ moduleName, missing });
    }

    moduleLines.push(`### Module: \`${moduleName}\``);
    moduleLines.push("");
    moduleLines.push(`- Frontend fields: ${frontendFields.length}`);
    moduleLines.push(`- Backend fields: ${backendFields.length}`);
    moduleLines.push(`- Missing in backend: ${missing.length}`);
    moduleLines.push(`- Extra in backend: ${extras.length}`);
    if (missing.length) {
      moduleLines.push(`- Missing fields: ${missing.join(", ")}`);
    }
    if (extras.length) {
      moduleLines.push(`- Extra fields: ${extras.join(", ")}`);
    }
    moduleLines.push("");
  }

  const frontendEndpoints = collectFrontendAdminEndpoints(adminMap);
  const backendEndpoints = collectBackendAdminEndpoints(serverSrcPath);
  const backendPathSet = new Set(backendEndpoints.map((entry) => entry.split(" ").slice(1).join(" ")));

  const missingEndpoints = frontendEndpoints.filter((endpoint) => !backendPathSet.has(endpoint));
  const matchedEndpoints = frontendEndpoints.length - missingEndpoints.length;

  const securityChecks = evaluateSecurity(repoRoot);

  const lines = [];
  lines.push("# Integration Check Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Schema Alignment Summary");
  lines.push("");
  lines.push(`- Compared modules: ${comparedModules}`);
  lines.push(`- Fully aligned modules: ${fullyAlignedModules}`);
  lines.push(`- Modules with mismatches: ${Math.max(0, comparedModules - fullyAlignedModules)}`);
  lines.push("");
  lines.push("## Endpoint Alignment Summary");
  lines.push("");
  lines.push(`- Frontend endpoint contracts: ${frontendEndpoints.length}`);
  lines.push(`- Backend endpoints matched: ${matchedEndpoints}`);
  lines.push(`- Backend missing endpoints: ${missingEndpoints.length}`);
  if (missingEndpoints.length) {
    lines.push(`- Missing endpoint paths: ${missingEndpoints.join(", ")}`);
  }
  lines.push("");
  lines.push("## Security Checklist");
  lines.push("");
  for (const check of securityChecks) {
    lines.push(`- [${check.ok ? "x" : " "}] ${check.key}`);
  }
  lines.push("");
  lines.push("## Missing Frontend Fields");
  lines.push("");
  if (!missingByModule.length) {
    lines.push("- None");
  } else {
    for (const entry of missingByModule) {
      lines.push(`- ${entry.moduleName}: ${entry.missing.join(", ")}`);
    }
  }
  lines.push("");
  lines.push("## Module Details");
  lines.push("");
  lines.push(...moduleLines);

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  try {
    fs.writeFileSync(reportPath, lines.join("\n"));
    console.log(`Generated ${path.relative(repoRoot, reportPath)}`);
  } catch (error) {
    if (error && error.code === "EPERM") {
      const fallbackPath = path.join(repoRoot, "server", "docs", "integration-check-report.md");
      fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
      fs.writeFileSync(fallbackPath, lines.join("\n"));
      console.log(
        `Generated ${path.relative(repoRoot, fallbackPath)} (fallback: write permission for docs/integration-check-report.md denied)`,
      );
      return;
    }
    throw error;
  }
}

generateReport();
