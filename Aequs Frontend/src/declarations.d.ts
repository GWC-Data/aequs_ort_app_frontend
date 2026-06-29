// src/declarations.d.ts
declare module '*.xlsx' {
  const content: string;
  export default content;
}

declare module '*.xls' {
  const content: string;
  export default content;
}