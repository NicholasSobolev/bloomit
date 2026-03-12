declare module "p5" {
  class p5 {
    [key: string]: any;
    constructor(sketch?: (p: p5) => void, node?: HTMLElement | string);
    remove(): void;
  }

  export default p5;
}

declare module "vanta/dist/vanta.topology.min";
