import Display from "./peripherals/display";
import Keyboard from "./peripherals/keyboard";
import Speaker from "./peripherals/speaker";

class Machine {
  QUIRKS: Record<string, boolean>;
  DISPLAY: Display;
  KEYBOARD: Keyboard;
  SPEAKER: Speaker;
  MEMORY: Uint8Array;
  V: Uint8Array;
  I: number;
  PC: number;
  DT: number;
  ST: number;
  STACK: number[];
  PAUSED: boolean;
  SPEED: number;

  constructor(quirks: Record<string, boolean>, displayScale: number = 15) {
    this.QUIRKS = quirks;
    this.DISPLAY = new Display(displayScale);
    this.KEYBOARD = new Keyboard();
    this.SPEAKER = new Speaker();

    this.MEMORY = new Uint8Array(4096); // 4KB of memory
    this.V = new Uint8Array(16); // 16 8 bit registers
    this.I = 0x0000; // 16 bit memory pointer
    this.PC = 0x0200; // program counter
    this.DT = 0; // delay timer
    this.ST = 0; // sound timer
    this.STACK = new Array();

    this.PAUSED = false;
    this.SPEED = 8;

    this.loadHexSpritesIntoRAM();
  }

  cycle(): void {
    for (let i = 0; i < this.SPEED; i++) {
      if (!this.PAUSED) {
        let opcode = (this.MEMORY[this.PC] << 8) | this.MEMORY[this.PC + 1];
        this.executeInstruction(opcode);
      }
    }

    if (!this.PAUSED) {
      this.updateTimers();
    }

    this.playSound();
    this.DISPLAY.refresh();
  }

  // assumes the program is coming in as an array of bytes
  loadProgramIntoRAM(program): void {
    program.forEach((byte, index) => {
      this.MEMORY[0x200 + index] = byte;
    });
  }

  private loadHexSpritesIntoRAM(): void {
    // prettier-ignore
    const SPRITES = [
      0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
      0x90, 0x90, 0xF0, 0x10, 0x10, // 4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
      0xF0, 0x10, 0x20, 0x40, 0x40, // 7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
      0xF0, 0x90, 0xF0, 0x90, 0x90, // A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
      0xF0, 0x80, 0x80, 0x80, 0xF0, // C
      0xE0, 0x90, 0x90, 0x90, 0xE0, // D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
      0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ];

    SPRITES.forEach((byte, index) => {
      this.MEMORY[index] = byte;
    });
  }

  private executeInstruction(opcode) {
    this.PC += 2;

    let x = (opcode & 0x0f00) >> 8;
    let y = (opcode & 0x00f0) >> 4;

    switch (opcode & 0xf000) {
      case 0x0000:
        switch (opcode) {
          case 0x00e0: // CLS
            this.DISPLAY.clear();
            break;

          case 0x00ee: // RET
            this.PC = this.STACK.pop();
            break;
        }
        break;

      case 0x1000: // JP addr
        this.PC = opcode & 0xfff;
        break;

      case 0x2000: // CALL addr
        this.STACK.push(this.PC);
        this.PC = opcode & 0xfff;
        break;

      case 0x3000: // SE Vx, byte
        if (this.V[x] === (opcode & 0xff)) {
          this.PC += 2;
        }
        break;

      case 0x4000: // SNE Vx, byte
        if (this.V[x] !== (opcode & 0xff)) {
          this.PC += 2;
        }
        break;

      case 0x5000: // SE Vx, Vy
        if (this.V[x] === this.V[y]) {
          this.PC += 2;
        }
        break;

      case 0x6000: // LD Vx, byte
        this.V[x] = opcode & 0xff;
        break;

      case 0x7000: // ADD Vx, byte
        this.V[x] += opcode & 0xff;
        break;

      case 0x8000:
        switch (opcode & 0xf) {
          case 0x0: // LD Vx, Vy
            this.V[x] = this.V[y];
            break;

          case 0x1: // OR Vx, Vy
            this.V[x] |= this.V[y];
            this.V[0xf] = 0;
            break;

          case 0x2: // AND Vx, Vy
            this.V[x] &= this.V[y];
            this.V[0xf] = 0;
            break;

          case 0x3: // XOR Vx, Vy
            this.V[x] ^= this.V[y];
            this.V[0xf] = 0;
            break;

          case 0x4: // ADD Vx, Vy
            this.V[x] += this.V[y];
            this.V[0xf] = this.V[x] < this.V[y] ? 1 : 0;
            break;

          case 0x5: // SUB Vx, Vy
            this.V[x] -= this.V[y];
            this.V[0xf] = ((this.V[x] + this.V[y]) & 0xff) < this.V[y] ? 0 : 1;
            break;

          case 0x6: // SHR Vx ,Vy
            if (this.QUIRKS.originalShiftBehavior) {
              this.V[x] = this.V[y]; // copy VY into VX
            }
            const rightmostBit = this.V[x] & 1; // grab rightmost bit
            this.V[x] >>= 1; // shift VX right 1 bit
            this.V[0xf] = rightmostBit; // store shifted-out bit in flag register(VF)
            break;

          case 0x7: // SUBN Vx, Vy
            this.V[x] = this.V[y] - this.V[x];
            this.V[0xf] = this.V[x] > this.V[y] ? 0 : 1;
            break;

          case 0xe: // SHL Vx ,Vy
            if (this.QUIRKS.originalShiftBehavior) {
              this.V[x] = this.V[y]; // copy VY into VX
            }
            const leftmostBit = this.V[x] >> 7; // grab leftmost bit
            this.V[x] <<= 1; // shift VX left 1 bit
            this.V[0xf] = leftmostBit; // store shifted-out bit in flag register(VF)
            break;
        }
        break;

      case 0x9000: // SNE Vx, Vy
        if (this.V[x] !== this.V[y]) {
          this.PC += 2;
        }
        break;

      case 0xa000: // LD I, addr
        this.I = opcode & 0xfff;
        break;

      case 0xb000: // JP V0, addr
        this.PC = this.V[0x0] + (opcode & 0xfff);
        break;

      case 0xc000: // RND Vx, byte
        let randomByte = Math.floor(Math.random() * 0xff);
        this.V[x] = randomByte & (opcode & 0xff);
        break;

      case 0xd000: // DRW Vx, Vy, nibble
        this.V[0xf] = 0; // reset flag register
        if (this.V[x] > this.DISPLAY.COLS) this.V[x] %= this.DISPLAY.COLS; // normalize starting col
        if (this.V[y] > this.DISPLAY.ROWS) this.V[y] %= this.DISPLAY.ROWS; // normalize starting row

        const spriteCols = 8; // sprite width
        const spriteRows = opcode & 0xf; // sprite height
        let row: number;
        let byte: number;
        let col: number;
        let bit: number;
        let pixelX: number;
        let pixelY: number;
        let erased: boolean;

        // for every sprite byte
        for (row = 0; row < spriteRows; row++) {
          byte = this.MEMORY[this.I + row];
          // for each bit in byte
          for (col = 0; col < spriteCols; col++) {
            bit = (byte >> (7 - col)) & 1; // get sprite pixel to toggle
            pixelX = this.V[x] + col;
            pixelY = this.V[y] + row;
            if (
              bit &&
              pixelX < this.DISPLAY.COLS &&
              pixelY < this.DISPLAY.ROWS
            ) {
              erased = this.DISPLAY.togglePixel(pixelX, pixelY);
              if (erased) {
                this.V[0xf] = 1;
              }
            }
          }
        }
        break;

      case 0xe000:
        switch (opcode & 0xff) {
          case 0x9e: // SKP Vx
            if (this.KEYBOARD.isKeyPressed(this.V[x])) {
              this.PC += 2;
            }
            break;

          case 0xa1: // SKNP Vx
            if (!this.KEYBOARD.isKeyPressed(this.V[x])) {
              this.PC += 2;
            }
            break;
        }
        break;

      case 0xf000:
        switch (opcode & 0xff) {
          case 0x07: // LD Vx, DT
            this.V[x] = this.DT;
            break;

          case 0x0a: // LD Vx, K
            this.PAUSED = true;
            this.KEYBOARD.onNextKeypress = (key) => {
              this.V[x] = key;
              this.PAUSED = false;
            };
            break;

          case 0x15: // LD DT, Vx
            this.DT = this.V[x];
            break;

          case 0x18: // LD ST, Vx
            this.ST = this.V[x];
            break;

          case 0x1e: // ADD I, Vx
            this.I += this.V[x];
            break;

          case 0x29: // LD F, Vx
            // Vx will come in holding a hex digit, we then load the location
            // of the corresponding hex sprite into I. The sprites are the first
            // things we loaded into memory, so we can get the memory address by
            // multiplying the hex digit by 5, because each sprite is 5 bytes long.
            //
            // Example: 0xF * 5 = 0x4B(75), so the sprite for F starts
            // at the 75th byte of memory(this.MEMORY[0x04B]).
            this.I = this.V[x] * 5;
            break;

          case 0x33: // LD B, Vx
            this.MEMORY[this.I] = Math.floor(this.V[x] / 100);
            this.MEMORY[this.I + 1] = Math.floor((this.V[x] % 100) / 10);
            this.MEMORY[this.I + 2] = Math.floor(this.V[x] % 10);
            break;

          case 0x55: // LD [I], Vx
            if (this.QUIRKS.incrementIndex) {
              for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
                this.MEMORY[this.I] = this.V[registerIndex];
                this.I += 1;
              }
            } else {
              for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
                this.MEMORY[this.I + registerIndex] = this.V[registerIndex];
              }
            }
            break;

          case 0x65: // LD Vx. [I]
            if (this.QUIRKS.incrementIndex) {
              for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
                this.V[registerIndex] = this.MEMORY[this.I];
                this.I += 1;
              }
            } else {
              for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
                this.V[registerIndex] = this.MEMORY[this.I + registerIndex];
              }
            }
            break;
        }
        break;

      default:
        throw new Error("Unknown opcode " + opcode);
    }
  }

  private updateTimers() {
    if (this.DT > 0) {
      this.DT -= 1;
    }
    if (this.ST > 0) {
      this.ST -= 1;
    }
  }

  private playSound() {
    if (this.ST > 0) {
      this.SPEAKER.play(440);
    } else {
      this.SPEAKER.stop();
    }
  }
}

export default Machine;
