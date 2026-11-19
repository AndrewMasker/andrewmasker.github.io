---
layout: page
title: Bashputer
description: a virtual machine written in the scripting language Bash
img: assets/img/projects/personal/bashputer/Maze.png
importance: 1
category: personal
related_publications: false
---

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

Given that the computer is implemented in Bash, many of the arithmetic choices are simply inherited from Bash arithmetic. Some of these choices are: no floating point numbers, registers are signed integers in arithmetic, 

In total there are 66 opcodes, though many are permutations of a basic concept, like loading or storing. These are fit into several categories of opcodes, as listed below.

#### Arithmetic

<div style="margin-left:2rem" markdown="1">

**ADD**: ADD rA, rB, rC - Performs rA plus rB and puts the result in rC. \\
**SUB**: SUB rA, rB, rC - Performs rA minus rB and puts the result in rC. \\
**INC**: INC rA - Increments the value in rA. \\
**DEC**: DEC rA - Decrements the value in rA. \\
**NEG**: NEG rA, rB - Puts the negative of rA into rB. \\
**MUL**: MUL rA, rB, rC - Performs rA times rB and puts the result in rC. \\
**DIV**: DIV rA, rB, rC - Performs rA divided by rB and puts the result in rC (rounds towards zero). \\
**REM**: REM rA, rB, rC - Performs rA divided rB and puts the remainder in rC. \\

</div>

#### Bitwise Operations

<div style="margin-left:2rem" markdown="1">

**AND**: AND rA, rB, rC - Performs bitwise and on rA and rB and puts the result in rC. \\
**OR**: OR rA, rB, rC - Performs bitwise or on rA and rB and puts the result in rC. \\
**XOR**: XOR rA, rB, rC - Performs bitwise xor on rA and rB and puts the result in rC. \\
**NOT**: XOR rA, rB - Performs logical not on rA and puts the result in rB. \\
**LSR**: LSR rA, rB, rC - Logically shifts rA by rB to the right and puts the result in rC. \\
**ASR**: ASR rA, rB, rC - Shifts rA by rB to the right, keeping the sign the same, and puts the result in rC. \\
**SHL**: SHL rA, rB, rC - Shifts rA by rB to the left and puts the result in rC. \\

</div>

#### Comparisons

<div style="margin-left:2rem" markdown="1">

**EQ**: EQ rA, rB, rC - If rA equals rB then rC is set to one, else to zero. \\

</div>

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
