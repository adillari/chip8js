class Screen {
  SCALE: number;
  ROWS: number;
  COLS: number;
  canvasElement: HTMLCanvasElement;
  canvas: CanvasRenderingContext2D;
  pixelArr: Array<boolean>;

  constructor(scale: number) {
    this.SCALE = scale;
    this.ROWS = 32;
    this.COLS = 64;

    this.canvasElement = document.querySelector("canvas");
    this.canvasElement.width = this.COLS * this.SCALE; // screen width in px
    this.canvasElement.height = this.ROWS * this.SCALE; // screen height in px

    this.canvas = this.canvasElement.getContext("2d");

    this.pixelArr = new Array(this.COLS * this.ROWS).fill(false); // array of all pixels
  }

  togglePixel(x, y) {
    [x, y] = this.normalizePixel(x, y);
    let pixel = x + y * this.COLS;

    this.pixelArr[pixel] = !this.pixelArr[pixel]; // flip pixel

    return !this.pixelArr[pixel]; // return true if the pixel was erased
  }

  clear() {
    this.pixelArr.fill(false);
  }

  refresh() {
    this.canvas.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height,
    ); // clear canvas

    this.pixelArr.forEach((pixel, index) => {
      if (pixel) {
        let x = index % this.COLS;
        let y = Math.floor(index / this.COLS);

        x *= this.SCALE;
        y *= this.SCALE;

        this.canvas.fillStyle = "#E879F9";
        this.canvas.fillRect(x, y, this.SCALE, this.SCALE);
      }
    });
  }

  // wraps out of bound pixels
  private normalizePixel(x, y): Array<number> {
    if (x > this.COLS) x -= this.COLS;
    if (x < 0) x += this.COLS;
    if (y > this.ROWS) y -= this.ROWS;
    if (y < 0) y += this.ROWS;

    return [x, y];
  }
}

export default Screen;
