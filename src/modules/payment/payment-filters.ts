export function buildStudentPaymentFilter(student: {
  id?: string | null;
  name: string;
}) {
  const filters: Array<Record<string, unknown>> = [
    { student_id: { $exists: false }, student_name: student.name },
    { student_id: null, student_name: student.name },
  ];

  if (typeof student.id === "string" && student.id.trim()) {
    filters.unshift({ student_id: student.id });
  }

  return { $or: filters };
}
