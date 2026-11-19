---
layout: page
title: Bashputer
description: a 64-bit computer built entirely in Bash
img: assets/img/projects/personal/bashputer/Maze.gif
importance: 1
category: personal
related_publications: false
---

<style>
  /* Spec list: borderless two-column table */
  .spec-table {
    width: 100%;
    margin-bottom: 1rem;
  }
  .spec-table td {
    border: none;
    background: none;
    padding: 0.1rem 0.5rem;
    vertical-align: top;
  }
  .spec-table td:first-child {
    width: 9rem;
    white-space: nowrap;
  }
  /* Opcode lists: borderless tables so the colons and dashes line up */
  .isa-table {
    width: 100%;
    table-layout: fixed; /* same column positions in every section */
    margin-bottom: 1rem;
  }
  .isa-table td {
    border: none;
    background: none;
    padding: 0 0.35rem;
    vertical-align: top;
  }
  .isa-table td:nth-child(1) {
    width: 8rem;
    white-space: nowrap;
  }
  .isa-table td:nth-child(3) {
    width: 10.5rem;
    white-space: nowrap;
  }
  .map-table td:nth-child(3) {
    width: 12.5rem;
  }
  /* the ":" and "-" columns hug their neighbours */
  .isa-table td:nth-child(2),
  .isa-table td:nth-child(4) {
    width: 0.6rem;
    padding: 0;
  }
  /* phones: "NAME : SYNTAX" on one line, description indented underneath */
  @media (max-width: 576px) {
    .isa-table,
    .isa-table tbody,
    .isa-table tr {
      display: block;
      width: auto;
    }
    .isa-table tr {
      margin-bottom: 0.5rem;
    }
    .isa-table td {
      display: inline;
      padding: 0;
    }
    .isa-table td:nth-child(2) {
      padding-right: 0.3rem;
    }
    .isa-table td:nth-child(4) {
      display: none;
    }
    .isa-table td:nth-child(5) {
      display: block;
      padding-left: 1.5rem;
    }
    .spec-table td {
      display: block;
      padding: 0;
    }
    .spec-table td:first-child {
      width: auto;
      margin-top: 0.5rem;
    }
  }
</style>

Note: The source code is on GitHub <a href="https://github.com/AndrewMasker/Bashputer">here</a>, and you can run Bashputer in your browser <a href="https://andrewmasker.github.io/webvm/">here</a>. Read [Try it online](#try-it-online) first, though, since it is very slow in the browser.

### Introduction / Motivation

A virtual machine is a simulated computer that runs on another computer. Virtual machines have plenty of serious uses, such as code portability, software development, and sandboxing. Bashputer is not one of those; aside from being a toy model, it has no real use case.

This is one of those projects that seems very silly at first glance but taught me a lot of useful skills along the way. I wanted to write a virtual machine because it seemed pretty cool. However, I didn't want to write a practical one, since I think I would have gotten stuck in a perfectionism spiral, and I just wanted a fun project. The best way I could think of to keep it fun without getting too invested was to write it in Bash, which is a terrible language to implement a virtual machine in, for a lot of reasons.

I learned a ton about computer architecture, virtual machines, Bash, and the way GNU/Linux works under the hood.

### Overview

Bashputer is an in-terminal, 64-bit, register-based RISC virtual machine written in Bash. It has a von Neumann architecture with memory-mapped IO, its own instruction set, an assembler (also written in Bash), and a small library of programs that includes Snake and Pong.

| **CPU** | 64-bit, little-endian, 256 general-purpose registers, 66 instructions |
| **Memory** | 64,000 bytes of ROM, 1,024,000 bytes of RAM, and 1,024,000 bytes of stack |
| **Screen** | Drawn in the terminal, up to 254 × 127 character cells or 254 × 254 pixels using half-block characters, in 256-color or 24-bit color |
| **Input** | Polled keyboard |
| **Other devices** | Millisecond timer, and a cartridge loader with persistent storage |
| **Software** | Bassm, an assembly language with macros, scoped labels, and compile-time arithmetic |
{: .spec-table}

### Architecture

Every hardware component of the computer is its own Bash process. The `computer.sh` script starts each component and connects to it with a pair of named pipes, one for input and one for output. Components never talk to each other directly. Instead, every message passes through `computer.sh`, which acts as the router for the whole machine. Messages are single lines of space-separated text, such as `load 0x000000000005DC10` or `data 0x2A`, and loads and stores use the same messages no matter which component they are going to. This makes the set of components easy to extend: a new device is a script that answers `load` and `store` messages, plus a couple of lines of config to give it a place in the address space.

**The clock cycle.** Each pass through the main loop in `computer.sh` is one clock cycle. It waits for the clock, then tells the CPU to step and routes its messages until the CPU says it is done, then does the same for the loader. The CPU runs until it makes one bus access (a load or store of a single byte), so internal work such as an addition takes no extra cycles. As a result, the cost of an instruction is the number of bytes it occupies plus the number of bytes it reads or writes. This simple cost model ends up mattering a lot for how fast programs run, as you can see in the [results](#results).

**A memory access.** Loading the byte `0x2A` from RAM at global address `0x5DC10` goes like this:

1. The CPU sends `load 0x000000000005DC10` to `computer.sh`, which forwards it to the bus interconnect.
2. The bus sees that the address belongs to RAM, subtracts the start of RAM's range, and replies `ram load 0x0000000000000010`.
3. `computer.sh` sends `load 0x0000000000000010` to RAM, which replies `data 0x2A`.
4. `computer.sh` passes `data 0x2A` back to the CPU.

There are eight component types used within the computer.

<div style="margin-left:2rem" markdown="1">

**CPU**: The CPU fetches and executes instructions. It is a nested state machine that keeps one state per level, so an instruction handler can call a helper like "load a word", which calls "load a half", and so on down to "load a byte", with each level tracking its own progress. Loading a word (8 bytes) therefore takes eight clock cycles, one per byte. The CPU has 256 general-purpose registers, so a single byte is enough to index them.

**Bus Interconnect**: The bus interconnect sits between the CPU and every component it can reach. Since the computer uses memory-mapped IO, the bus decodes each address to find the component it belongs to, removes that component's offset so the address is local to the component, and sends the request on to it. It also enforces permissions: writes to read-only memory are dropped, and reads from unmapped addresses return zero.

**Clock**: The clock tells clockable components when to take a step. Its period is configurable, but by default it lets the computer run as fast as the host allows (which, being Bash, is not very fast).

**Keyboard**: The keyboard takes input from the user and exposes it to the CPU through memory-mapped registers. There is a register for whether a key press is waiting, one that pops the oldest key from the buffer, and one that clears the buffer. There are no interrupts, so programs have to poll.

**Loader**: The loader copies data between cartridges and memory while the CPU keeps running, and anything written to a cartridge is saved to its file on disk. It can also clear large parts of RAM. It is fairly slow, but it could in principle be used with a bootloader program to make a simple OS.

**RAM**: The RAM holds memory. Each byte is stored as a two-digit hex number in a sparse associative array, so unused memory takes no space and reads as zero. The same RAM component is instantiated three times as the ROM, the RAM, and the stack. These could all be a single component, but it is a bit less annoying to keep them separate.

**Screen**: The screen is a cursor-based drawing system that draws characters and pixels to the terminal using ANSI escape codes. Pixel mode uses half-block characters, so each character cell holds two pixels stacked on top of each other. It supports 24-bit RGB color as well as the standard 256-color palette. Drawing is buffered until the program asks for it to be shown, so a whole frame appears at once. The screen also keeps a shadow copy of what has been drawn, which programs can read back.

**Timer**: The timer counts milliseconds of real-world time. It isn't that useful for this VM, since Bash is incredibly slow, so it doesn't really get used for frame-rate timing.

</div>

**The memory map.** All of memory and every device share a single byte-addressed address space:

| **ROM** | : | 0 to 63,999 | - | Holds the program. Execution starts at address 0. |
| **Screen** | : | 64,000 to 191,999 | - | Cursor, color, and drawing registers. |
| **Keyboard** | : | 192,000 to 255,999 | - | Status, data, and clear registers. |
| **Timer** | : | 256,000 to 319,999 | - | Reset, trigger, and an 8-byte tick count. |
| **Loader** | : | 320,000 to 383,999 | - | Cartridge number, command, status, and address registers. |
| **RAM** | : | 384,000 to 1,407,999 | - | General-purpose memory. |
| **Stack** | : | 1,408,000 to 2,431,999 | - | Stack memory. The stack grows upward. |
{: .isa-table .map-table}

**Sandboxing.** When run locally, `run.sh` starts the computer inside a <a href="https://github.com/containers/bubblewrap">bubblewrap</a> sandbox with no network access and a read-only view of the host filesystem. The only writable directories are the cartridges, so that programs can save data through the loader.

### Instruction Set Architecture

The computer has a variable-length instruction set. Each instruction is a single opcode byte followed by zero or more operand bytes. Register operands take one byte, and immediate values take 1, 2, 4, or 8 bytes, stored little-endian. For example, the instruction that adds register 0 to register 1 and puts the result in register 2 is `0x02 0x00 0x01 0x02`, where the leading `0x02` is the ADD opcode and the following bytes are the registers. The destination register always comes last.

Since the computer is implemented in Bash, a lot of the arithmetic behavior is simply inherited from Bash arithmetic. The two big consequences are that there are no floating-point numbers, and that registers are treated as signed integers in arithmetic. Division by zero doesn't crash the machine; it returns a defined value instead.

In total there are 66 instructions, though many are variations on one idea, like loading or storing different sizes. They fall into the categories listed below.

Instructions that come in several widths use a suffix for the size: **B** for a byte (1 byte), **Q** for a quarter (2 bytes), **H** for a half (4 bytes), and **W** for a word (8 bytes). These are written together below, so LD[B/Q/H/W] stands for LDB, LDQ, LDH, and LDW. Any opcode that isn't assigned an instruction halts the CPU.

**Control**

<div style="margin-left:2rem" markdown="1">

| **NOP** | : | NOP | - | Does nothing. |
| **HLT** | : | HLT | - | Halts the CPU, which stops the computer. |
{: .isa-table}

</div>

**Arithmetic**

<div style="margin-left:2rem" markdown="1">

| **ADD** | : | ADD rA, rB, rC | - | Performs rA plus rB and puts the result in rC. |
| **SUB** | : | SUB rA, rB, rC | - | Performs rA minus rB and puts the result in rC. |
| **INC** | : | INC rA | - | Increments the value in rA. |
| **DEC** | : | DEC rA | - | Decrements the value in rA. |
| **NEG** | : | NEG rA, rB | - | Puts the negative of rA into rB. |
| **MUL** | : | MUL rA, rB, rC | - | Performs rA times rB and puts the result in rC. |
| **DIV** | : | DIV rA, rB, rC | - | Performs rA divided by rB and puts the result in rC (rounds towards zero). |
| **REM** | : | REM rA, rB, rC | - | Performs rA divided by rB and puts the remainder in rC. |
{: .isa-table}

</div>

**Bitwise Operations**

<div style="margin-left:2rem" markdown="1">

| **AND** | : | AND rA, rB, rC | - | Performs bitwise and on rA and rB and puts the result in rC. |
| **OR** | : | OR rA, rB, rC | - | Performs bitwise or on rA and rB and puts the result in rC. |
| **XOR** | : | XOR rA, rB, rC | - | Performs bitwise xor on rA and rB and puts the result in rC. |
| **NOT** | : | NOT rA, rB | - | Performs bitwise not on rA and puts the result in rB. |
| **LSR** | : | LSR rA, rB, rC | - | Logically shifts rA by rB to the right and puts the result in rC. |
| **ASR** | : | ASR rA, rB, rC | - | Shifts rA by rB to the right, keeping the sign the same, and puts the result in rC. |
| **SHL** | : | SHL rA, rB, rC | - | Shifts rA by rB to the left and puts the result in rC. |
{: .isa-table}

</div>

**Comparisons**

<div style="margin-left:2rem" markdown="1">

| **EQ** | : | EQ rA, rB, rC | - | If rA equals rB then rC is set to one, else to zero. |
| **NEQ** | : | NEQ rA, rB, rC | - | If rA does not equal rB then rC is set to one, else to zero. |
| **LT** | : | LT rA, rB, rC | - | If rA is less than rB (unsigned) then rC is set to one, else to zero. |
| **LTS** | : | LTS rA, rB, rC | - | If rA is less than rB (signed) then rC is set to one, else to zero. |
| **LE** | : | LE rA, rB, rC | - | If rA is less than or equal to rB (unsigned) then rC is set to one, else to zero. |
| **LES** | : | LES rA, rB, rC | - | If rA is less than or equal to rB (signed) then rC is set to one, else to zero. |
| **GT** | : | GT rA, rB, rC | - | If rA is greater than rB (unsigned) then rC is set to one, else to zero. |
| **GTS** | : | GTS rA, rB, rC | - | If rA is greater than rB (signed) then rC is set to one, else to zero. |
| **GE** | : | GE rA, rB, rC | - | If rA is greater than or equal to rB (unsigned) then rC is set to one, else to zero. |
| **GES** | : | GES rA, rB, rC | - | If rA is greater than or equal to rB (signed) then rC is set to one, else to zero. |
{: .isa-table}

</div>

**Loads and Stores**

<div style="margin-left:2rem" markdown="1">

| **LD[B/Q/H/W]** | : | LD[B/Q/H/W] rA, rB | - | Loads the value of the given size from the memory address in rA, zero-extends it, and puts it in rB. |
| **LI[B/Q/H/W]** | : | LI[B/Q/H/W] rA, imm | - | Loads an immediate value of the given size, encoded directly in the instruction, into rA (zero-extended). |
| **ST[B/Q/H/W]** | : | ST[B/Q/H/W] rA, rB | - | Stores the low bytes of rA, of the given size, to the memory address in rB. |
{: .isa-table}

</div>

**Jumps and Branches**

All jump, branch, and call targets are relative to the jump origin register JO, so the CPU actually jumps to the target plus JO. The register forms are much cheaper than the immediate forms, since every byte of a 64-bit immediate address has to be fetched from memory: `JMP` takes 2 clock cycles, while `JMPI` takes 9.

<div style="margin-left:2rem" markdown="1">

| **JMP** | : | JMP rA | - | Jumps to the address in rA. |
| **BZ** | : | BZ rA, rB | - | If rA is zero, jumps to the address in rB. |
| **BNZ** | : | BNZ rA, rB | - | If rA is not zero, jumps to the address in rB. |
| **JMPI** | : | JMPI imm64 | - | Jumps to the 64 bit immediate address. |
| **BZI** | : | BZI rA, imm64 | - | If rA is zero, jumps to the 64 bit immediate address. |
| **BNZI** | : | BNZI rA, imm64 | - | If rA is not zero, jumps to the 64 bit immediate address. |
{: .isa-table}

</div>

**Stack**

<div style="margin-left:2rem" markdown="1">

| **PSH[B/Q/H/W]** | : | PSH[B/Q/H/W] rA | - | Pushes the low bytes of rA, of the given size, onto the stack and moves the stack pointer up. |
| **POP[B/Q/H/W]** | : | POP[B/Q/H/W] rA | - | Pops a value of the given size off of the stack into rA (zero-extended) and moves the stack pointer down. |
| **SSP** | : | SSP rA | - | Sets the stack pointer to the value in rA. |
| **SSPI** | : | SSPI imm64 | - | Sets the stack pointer to the 64 bit immediate value. |
| **XSP** | : | XSP rA | - | Swaps the stack pointer with the value in rA. |
{: .isa-table}

</div>

**Calls**

<div style="margin-left:2rem" markdown="1">

| **CAL** | : | CAL rA | - | Pushes the return address onto the stack, then jumps to the address in rA. |
| **CALI** | : | CALI imm64 | - | Pushes the return address onto the stack, then jumps to the 64 bit immediate address. |
| **RET** | : | RET | - | Pops the return address off of the stack and jumps to it. |
{: .isa-table}

</div>

**Register Moves**

<div style="margin-left:2rem" markdown="1">

| **MOV** | : | MOV rA, rB | - | Copies the value in rA into rB. |
| **PC** | : | PC rA | - | Puts the address of this PC instruction into rA. |
| **SP** | : | SP rA | - | Puts the stack pointer into rA. |
| **SJO** | : | SJO rA | - | Sets the jump origin to the value in rA. |
{: .isa-table}

</div>

**Random Numbers**

<div style="margin-left:2rem" markdown="1">

| **RND** | : | RND rA | - | Puts the next pseudorandom value from the xorshift generator into rA. |
| **SEED** | : | SEED rA | - | Seeds the random number generator with the value in rA. |
| **ENT** | : | ENT rA | - | Puts a random value from the host machine into rA, which is useful as a seed. |
{: .isa-table}

</div>

### Bassm: The Assembly Language

Programs for the Bashputer are written in Bassm, an assembly language with macros, scoped labels, and compile-time arithmetic. Its assembler is, of course, also written in Bash, and it turns `.bassm` source files into cartridges: plain-text files of addresses and hex bytes that get copied into ROM when the computer starts. Bassm has its own project page <a href="{% link _projects/bassm.md %}">here</a>, which covers the language, the assembler, and how its macros are used to build structured control flow out of raw branches.

### Results

Bashputer is a surprisingly capable machine given that it is written entirely in Bash. That isn't to say it is fast (it is actually quite slow), but it has a rich enough set of features to allow for some interesting and fun programs.

Below you can see two versions of Snake written for the Bashputer in <a href="{% link _projects/bassm.md %}">Bassm</a>. The left version was written entirely by me, and is the result of a few rounds of optimization to get it to a decent speed that isn't agonizing to play. The right is a version of my code that was optimized by Claude. It inlines most of the code rather than using calls and returns, avoids most immediate-mode loads and jumps, and uses a different erase-and-grow strategy over the ring buffer I implemented. Each of those changes targets the cost model described above: a `CALI` followed by a `RET` costs 26 clock cycles, and a `JMPI` costs 9 where a register `JMP` costs only 2. Together they speed the game up to the point that it is actually decently challenging, which shows that a fast program can be achieved even on a machine this slow with proper optimization.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="assets/img/projects/personal/bashputer/Snake.webm" class="img-fluid rounded" autoplay=true muted=true loop=true %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="assets/img/projects/personal/bashputer/FastSnake.webm" class="img-fluid rounded" autoplay=true muted=true loop=true %}
    </div>
</div>
<div class="caption">
    Fig. 1. The game Snake running on the Bashputer. Left is the version I wrote by hand, and right is a version of my code that was optimized by Claude.
</div>

The repo also includes a Fibonacci printer that I wrote, along with a few programs written by Claude to exercise the machine: a Towers of Hanoi solver, a tour of the assembly language's features, two-player Pong (plus a faster rebuild of it in the style of FastSnake), and an endless rainbow maze generator. The FastPong program and Maze program are shown below.

<div class="row justify-content-sm-center">
    <div class="col-sm-8 mt-3 mt-md-0" style="flex: 1.043 1 0%;">
        {% include video.liquid path="assets/img/projects/personal/bashputer/FastPong.webm" class="img-fluid rounded" autoplay=true muted=true loop=true %}
    </div>
    <div class="col-sm-8 mt-3 mt-md-0" style="flex: 1.777 1 0%;">
        {% include video.liquid path="assets/img/projects/personal/bashputer/Maze.webm" class="img-fluid rounded" autoplay=true muted=true loop=true %}
    </div>
</div>
<div class="caption">
    Fig. 2. The Maze cartridge, written by Claude, generating endless rainbow mazes.
</div>

### Try It Online

You can play FastSnake in a browser-based VM <a href="https://andrewmasker.github.io/webvm/">here</a>. This is my fork of <a href="https://github.com/leaningtech/webvm">WebVM</a>, which runs a Debian image with Bashputer already cloned in, and boots straight into the game. It is very slow to start and run in the browser, so you have to be patient with the moves; each key press takes effect one or two frames after it is pressed. Use w, a, s, and d to move, and q to quit.

Once you quit, the console will eventually be returned to you in the Bashputer folder. If you are comfortable in a terminal, you can run other cartridges from there with `computer.sh`, for example:

```bash
bash src/Computer/computer.sh Snake
```

Cartridge names are case-sensitive, and the available ones are in `src/Cartridges/`. In the browser the computer is started with `computer.sh` directly instead of `run.sh`, since bubblewrap isn't available there (and the VM is already a sandbox anyway).

Getting the Bashputer to run in WebVM took a couple of workarounds. The clock paces the computer by waiting on `read` with a timeout, and in Bash 5.0 those timeouts are implemented with `SIGALRM`, which never fires under WebVM's x86 emulator. The image uses Debian Bookworm instead, whose Bash 5.2 implements the timeouts with `pselect()`, which does work. Bookworm's `mkfifo`, however, uses a system call the emulator doesn't implement, so the image also ships a tiny replacement `mkfifo` written in C that uses `mknod` instead.

### Implementation

This project was implemented in <a href="https://www.gnu.org/software/bash/manual/bash.html">Bash</a>, with <a href="https://github.com/containers/bubblewrap">bubblewrap</a> for sandboxing. The computer and assembler are my own code. Some of the example programs, the FastSnake optimizations, and the repo's documentation were written with Claude, and the repo's README lists exactly which files used AI and how.
