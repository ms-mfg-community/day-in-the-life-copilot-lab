function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escape(title)} — Contoso University (Node)</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
    nav a { margin-right: 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #f5f5f5; }
    label { display: block; margin: 0.5rem 0 0.25rem; font-weight: 600; }
    input { padding: 0.4rem; width: 100%; max-width: 320px; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; }
  </style>
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/students">Students</a>
    <a href="/courses">Courses</a>
    <a href="/instructors">Instructors</a>
  </nav>
  <h1>${escape(title)}</h1>
  ${body}
</body>
</html>`;
}

export const html = { escape };
