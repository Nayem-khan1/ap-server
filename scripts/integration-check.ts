import fs from "fs";
import path from "path";

type AdminModule = {
  module: string;
  zod_schemas?: Array<{
    schema_name: string;
    fields: Array<{ field: string }>;
  }>;
  form_field_names?: string[];
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function extractObjectFields(content: string): string[] {
  const fields = new Set<string>();
  const objectMatches = content.matchAll(/z\.object\s*\(\s*\{([\s\S]*?)\}\s*\)/g);
  for (const match of objectMatches) {
    const body = match[1];
    const keyMatches = body.matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm);
    for (const keyMatch of keyMatches) {
      fields.add(keyMatch[1]);
    }
  }
  return [...fields].sort();
}

function normalizeModule(moduleName: string): string {
  const map: Record<string, string> = {
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
    blog: "blog",
    events: "event",
    certificates: "certificate",
    analytics: "analytics",
    settings: "settings",
  };
  return map[moduleName] ?? moduleName;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function generateReport() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const adminMapPath = path.join(repoRoot, "docs", "admin-schema-map.json");
  const serverModulesPath = path.join(repoRoot, "server", "src", "modules");
  const reportPath = path.join(repoRoot, "docs", "integration-check-report.md");

  const adminMap = readJson<{ modules: AdminModule[] }>(adminMapPath);

  const backendModules = fs
    .readdirSync(serverModulesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const backendFieldMap = new Map<string, string[]>();
  for (const backendModule of backendModules) {
    const schemaPath = path.join(serverModulesPath, backendModule, "schema.ts");
    if (!fs.existsSync(schemaPath)) continue;
    const content = fs.readFileSync(schemaPath, "utf8");
    backendFieldMap.set(backendModule, extractObjectFields(content));
  }

  const adminFieldMap = new Map<string, string[]>();
  for (const moduleEntry of adminMap.modules) {
    const normalized = normalizeModule(moduleEntry.module);
    const schemaFields =
      moduleEntry.zod_schemas?.flatMap((schema) =>
        schema.fields.map((field) => field.field),
      ) ?? [];
    const formFields = moduleEntry.form_field_names ?? [];
    const merged = unique([...(adminFieldMap.get(normalized) ?? []), ...schemaFields, ...formFields]);
    adminFieldMap.set(normalized, merged.sort());
  }

  const lines: string[] = [];
  lines.push("# Integration Check Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");

  let totalModules = 0;
  let fullyAligned = 0;
  const detailLines: string[] = [];

  for (const [moduleName, adminFields] of adminFieldMap.entries()) {
    const backendFields = backendFieldMap.get(moduleName) ?? [];
    if (!backendFieldMap.has(moduleName)) continue;
    totalModules += 1;

    const adminSet = new Set(adminFields);
    const backendSet = new Set(backendFields);
    const missing = adminFields.filter((field) => !backendSet.has(field));
    const extra = backendFields.filter((field) => !adminSet.has(field));

    const aligned = missing.length === 0;
    if (aligned) fullyAligned += 1;

    detailLines.push(`### Module: \`${moduleName}\``);
    detailLines.push("");
    detailLines.push(`- Admin fields: ${adminFields.length}`);
    detailLines.push(`- Backend fields: ${backendFields.length}`);
    detailLines.push(`- Missing in backend: ${missing.length}`);
    detailLines.push(`- Extra in backend: ${extra.length}`);
    if (missing.length) {
      detailLines.push(`- Missing fields: ${missing.slice(0, 50).join(", ")}`);
    }
    if (extra.length) {
      detailLines.push(`- Extra fields: ${extra.slice(0, 50).join(", ")}`);
    }
    detailLines.push("");
  }

  lines.push(`- Compared modules: ${totalModules}`);
  lines.push(`- Fully aligned modules: ${fullyAligned}`);
  lines.push(`- Modules with mismatches: ${Math.max(0, totalModules - fullyAligned)}`);
  lines.push("");
  lines.push("## Module Details");
  lines.push("");
  lines.push(...detailLines);

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`Generated ${path.relative(repoRoot, reportPath)}`);
}

generateReport();

