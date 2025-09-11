// Polyfill for DOMMatrix in Node.js environment
// This is needed for pdf-lib to work in server-side rendering

if (typeof global !== 'undefined' && !global.DOMMatrix) {
  global.DOMMatrix = class DOMMatrix {
    a: number = 1;
    b: number = 0;
    c: number = 0;
    d: number = 1;
    e: number = 0;
    f: number = 0;

    constructor(init?: string | number[]) {
      if (typeof init === 'string') {
        // Parse matrix string if needed
        const values = init.match(/matrix\(([^)]+)\)/);
        if (values) {
          const nums = values[1].split(',').map((n) => parseFloat(n.trim()));
          [this.a, this.b, this.c, this.d, this.e, this.f] = nums;
        }
      } else if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }

    translate(tx: number, ty: number): DOMMatrix {
      this.e += tx;
      this.f += ty;
      return this;
    }

    scale(sx: number, sy?: number): DOMMatrix {
      sy = sy ?? sx;
      this.a *= sx;
      this.d *= sy;
      return this;
    }

    rotate(angle: number): DOMMatrix {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const a = this.a;
      const b = this.b;
      const c = this.c;
      const d = this.d;

      this.a = a * cos + c * sin;
      this.b = b * cos + d * sin;
      this.c = -a * sin + c * cos;
      this.d = -b * sin + d * cos;

      return this;
    }
  } as any;
}

export {};
