---
layout: page
title: Bashputer
description: a virtual machine written in the scripting language Bash
img: assets/img/projects/personal/bashputer/Maze.gif
importance: 1
category: personal
related_publications: false
---

<style>
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
  }
</style>

Note: If you want to know more about how Bashputer works, take a look at the repo <a href="https://github.com/AndrewMasker/Bashputer">here</a>. The Bashputer is within the `src` folder.

### Introduction / Motivation

A virtual machine is a simulated computer that runs on another computer. There are serious use cases for virtual machine, such as code portability, software development, or sandboxing, among other things. This is not a project that has an actual legitimate use case aside from being a toy model.

Honestly, this is kind of one of those projects that seem very silly at first glance, but actually taught many useful skills in the process of creating it. I wanted to write a virtual machine because it seemed pretty cool. However, I didn't really want to write a practical machine, as I think I would get stuck in a bit of a perfectionism spiral and I just kind of wanted a fun project. The best way that I could think of making it fun, yet not something I would get too invested in was by writing it in Bash, which is a terrible language to implement a virtual machine in, for a lot of reasons.

I learned a ton about computer architecture, virtual machines, bash, and the way GNU/linux works under the hood.

### General

Bashputer is an in-terminal, 64 bit, register-based, RISC virtual machine written in bash. It has a von Neumann architecture with memory-mapped IO. The computer is organized as a modular system with components using the same message passing system used to load and store data. The components are then piped together within the Computer.sh script, which uses a general system that allows easy extension of the set of components.

There are eight components types that are used within the computer.

<div style="margin-left:2rem" markdown="1">

**CPU**: The CPU is in charge of performing actions based on the current instruction. It uses a multi-level state based approach to track the current step in the given instruction, for example fetching a word (8 bytes) requires some clock cycles to initialize itself, then eight to load each byte, then some to clean up and increment the process counter. It has 256 general purpose registers, such that a byte is used to index them.

**Bus Interconnect**: The bus interconnect acts as a buffer between the CPU and all of the components it can interact with. Since the computer uses memory-mapped IO, an address must be decoded and sent to the correct component by finding where an address maps to, then removing the offset to make the address local to the component, and finally retransmitting the message specifically pointed to that component.

**Clock**: The clock tells clockable components when to perform a step.

**Keyboard**: The keyboard takes input from the user and exposes it to the CPU through some memory-mapped registers. There are registers for whether key presses are waiting and what the current key in the buffer is, along with an additional register used for clearing the current key buffer.

**Loader**: The loader is used to load cartridges into memory, and to write memory into cartridges. It can also be used to clear large parts of the ram. It is fairly slow, but could in principle be used with a bootloader program to make a simple OS.

**RAM**: The RAM is a component that is used to hold memory. Each byte is stores as a two digit hex number. The RAM component is instantiated multiple times into the RAM, ROM, and stack memory. These could all be a single RAM component, but it is just a bit less annoying to separate them out.

**Screen**: The screen is a cursor based drawing system that can draw pixels and characters to a terminal using escape codes. It supports 24 bit RGB, along with byte indexed colors. It also has a shadow of the screen, which allows for read back.

**Timer**: The timer gives out millisecond level ticks of real world time. It is not that useful for this VM, as it is written in Bash and incredibly slow, which means that it isn't really used for any sort of frame rate stuff.

</div>

### Instruction Set Architecture

The computer has a variable instruction length ISA in which an instruction is encoded as a single opcode byte followed by zero or more arguments. For example, the instruction for adding register 0 to register 1 and placing the result in register 2 is 0x02 0x00 0x01 0x02 where the leading 0x02 represents the ADD instruction, and the following bytes are interpreted as the registers.

Given that the computer is implemented in Bash, many of the arithmetic choices are simply inherited from Bash arithmetic. The two big of these are no floating point numbers and registers are signed integers in arithmetic.

In total there are 66 opcodes, though many are permutations of a basic concept, like loading or storing. These are fit into several categories of opcodes, as listed below.

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
| **REM** | : | REM rA, rB, rC | - | Performs rA divided rB and puts the remainder in rC. |
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

All jump, branch, and call targets are relative to the jump origin register JO, so the CPU actually jumps to the target plus JO.

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

### Results

Bashputer is a surprisingly capable machine given that it is written entirely in Bash. That isn't to say that it is very fast, in fact it is quite slow, but it does have a rich set of features that allow for some very interesting and fun programs.

Below you can see two versions of snake written for the Bashputer in <a href="">Bassm</a> (the assembly language for Bashputer). The left version was entirely written by me. It is the result of a few rounds of optimization to get it to a decently fast speed that isn't agonizing to play. The right is a version of my code that has been optimized by Claude that inlines most stuff rather than using calls and returns, removes most immediate mode loads and jumps, and works with a different erase and grow strategy over the ring buffer I implemented. This all speeds up the game to the point that is actually decently challenging, showing that a fast program can be achieved with proper optimization. 

You can actually play the FastSnake game in a browser based VM online <a href="https://andrewmasker.github.io/webvm/">here</a>, although it is very slow to run and start in the browser. You have to be patient on the moves; each key press takes effect one or two frames after pressed. Use wasd to move, q to quit. If you quit, eventually the console will be returned to you, from which you can run other cartridges using the computer.sh script if you are comfortable in a terminal.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="assets/img/projects/personal/bashputer/Snake.webm" class="img-fluid rounded" autoplay=true muted=true loop=true %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="assets/img/projects/personal/bashputer/FastSnake.webm" class="img-fluid rounded" autoplay=true muted=true loop=true %}
    </div>
</div>
<div class="caption">
    Fig. 1. The game snake running on the Bashputer. Left is a naturally written version by me, and right is a version of my code that has been optimized by claude.
</div>

### Implementation

This project was implemented in <a href="https://www.gnu.org/software/bash/manual/bash.html">Bash</a>.
