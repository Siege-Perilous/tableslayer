/*
  These definitions must live in a separate definition file from
  app.d.ts or VSCode will not recognize them
*/

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.glsl?raw' {
  const value: string;
  export default value;
}

declare module '*.frag?raw' {
  const value: string;
  export default value;
}

declare module '*.vert?raw' {
  const value: string;
  export default value;
}
