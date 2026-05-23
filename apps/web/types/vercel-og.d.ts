declare module '@vercel/og' {
  export class ImageResponse extends Response {
    constructor(element: import('react').ReactElement, init?: { width?: number; height?: number });
  }
}
