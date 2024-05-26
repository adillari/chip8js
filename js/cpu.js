class CPU {
  constructor(screen, keyboard, speaker) {
    this.SCREEN = screen;
    this.KEYBOARD = keyboard;
    this.SPEAKER = speaker;

    this.MEMORY = new Uint8Array(4096); // 4KB of memory
    this.V = new Uint8Array(16); // 16 8 bit registers
    this.I = 0x0000; // 16 bit memory pointer
    this.PC = 0x0200; // program counter
    this.DT = 0; // delay timer
    this.ST = 0; // sound timer
    this.STACK = new Array();

    this.PAUSED = false;
    this.SPEED = 10;
  }

  cycle() {
    for (let i = 0; i < this.SPEED; i++) {
      if (!this.PAUSED) {
        let opcode = (this.MEMORY[this.PC] << 8 | this.MEMORY[this.PC + 1]);
        this.executeInstruction(opcode)
      }
    }

    if (!this.PAUSED) {
      this.#updateTimers();
    }

    this.#playSound();
    this.SCREEN.refresh();
  }

  loadRom(filename) {
    var request = new XMLHttpRequest;
    var self = this;

    request.onload = () => {
      if (request.response) {
        let program = new Uint8Array(request.repsonse)
        self.loadProgramIntoRAM(program)
      }
    }

    request.open('GET', `roms/${filename}`);
    request.responseType = 'arraybuffer';
    request.send();
  }

  // assumes the program is coming in as an array of bytes
  loadProgramIntoRAM(program) {
    program.forEach((byte, index) => {
      this.MEMORY[0x200 + index] = byte;
    })
  }

  loadHexSpritesIntoRAM() {
    SPRITES = [
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

  //
  // private
  //

  executeInstruction(opcode) {
    this.PC += 2;

    let x = (opcode & 0x0F00) >> 8;
    let y = (opcpde & 0x00F0) >> 4;
    
    switch(opcode & 0xF000) {
      case 0x0000:
        switch(opcode) {
          case 0x00E0: // CLS
            this.SCREEN.clear();
            break;
          case: 0x00EE: // RET
            this.PC = this.STACK.pop();
            break;
        break;
      case 0x1000:
        break;
      case 0x2000:
        break;
      case 0x3000:
        break;
      case 0x4000:
        break;
      case 0x5000:
        break;
      case 0x6000:
        break;
      case 0x7000:
        break;
      case 0x8000:
        break;
      case 0x9000:
        break;
      case 0xA000:
        break;
      case 0xB000:
        break;
      case 0xC000:
        break;
      case 0xD000:
        break;
      case 0xE000:
        break;
      case 0xF000:
        break;
      default:
        throw new Error('Unknown opcode ' + opcode);
    }
  }

  #updateTimers() {
    if (this.DT > 0) { this.DT -= 1; }
    if (this.ST > 0) { this.ST -= 1; }
  }

  #playSound() {
    if (this.soundTimer > 0) {
      this.speaker.play(440);
    } else {
      this.speaker.stop();
    }
  }
}

export default CPU;