---
layout: page
title: Bassm
description: an assembly language and assembler for the Bashputer, also written in Bash
img: assets/img/projects/personal/bassm/thumbnail.png
importance: 2
category: personal
related_publications: false
---

Note: Bassm is the assembly language for my <a href="{% link _projects/bashputer.md %}">Bashputer</a> virtual machine, so that page is the place to start if you haven't seen it. The assembler is in the `Assembler` folder of the repo <a href="https://github.com/AndrewMasker/Bashputer">here</a>, and the full language reference is the <a href="https://github.com/AndrewMasker/Bashputer/blob/master/docs/assembly-language.md">assembly language guide</a>.

### Overview

The Bashputer runs programs stored as raw bytes, and writing those bytes by hand gets old very quickly. Bassm is the assembly language for the machine, and its assembler turns `.bassm` source files into cartridges the Bashputer can run. Like everything else in the project, the assembler is written in Bash, at about a thousand lines.

Bassm is a fairly small language, but it has a few features that make it much more pleasant to write than plain assembly:

- **Labels and scopes**, so the same label name can be reused in different parts of a program
- **Compile-time arithmetic**, evaluated with Bash arithmetic, including on label addresses
- **Substitutions and macros**, which are powerful enough to build structured control flow such as `if` and `while` out of raw branches
- **Label origins**, for writing code that runs correctly wherever it is loaded in memory

### The Assembler

The assembler runs in three stages, each its own script:

1. The **preprocessor** removes comments, splits lines into statements, and expands substitutions and macros.
2. The **processor** assigns an address to every statement, resolves labels, and evaluates arithmetic.
3. The **hexer** encodes each statement as bytes, using a table of opcodes and operand sizes.

Running it with `-k` keeps the output of each stage, which is the quickest way to see what a macro actually expanded to.

```bash
bash Assembler/assembler.sh MyProgram.bassm -o src/Cartridges/MyProgram
src/run.sh MyProgram
```

The output is a cartridge, which is just a plain-text file. Each line holds a starting address followed by up to 16 bytes, and when the Bashputer starts, the cartridge is copied into ROM and execution begins at address 0:

```text
0x0000000000000000 0x1F 0x2A 0x14 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x36 0x08 0x38 0x08 0x1F 0x1F
0x0000000000000010 0x67 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x28 0x1F 0x1F 0x06 0x48 0x00 0x00 0x00
```

### A First Program

This program prints `Hello!` and waits for a key press. All of the screen and keyboard registers are memory-mapped, so drawing a character is just a matter of storing the column into the cursor register and the character into the cell register. Nothing appears on screen until the program writes to `BLIT`.

```bassm
def SCREEN    = 64000
def CX        = ( $SCREEN + 2 )
def CELL      = ( $SCREEN + 14 )
def BLIT      = ( $SCREEN + 15 )
def FILL      = ( $SCREEN + 16 )
def KB_STATUS = 192000

def r_ptr  = r1                     # address of the next character
def r_char = r2                     # the current character
def r_col  = r3                     # the current column
def r_cx   = r4                     # address of the CX register
def r_cell = r5                     # address of the CELL register
def r_addr = r6                     # scratch address

liw $r_addr , $FILL
stb $r_addr , $r_addr               # any write clears the screen

liw $r_ptr , :message
lib $r_col , 0
liw $r_cx , $CX
liw $r_cell , $CELL

next:
    ldb $r_ptr , $r_char            # read a character
    bzi $r_char , :done             # stop at the terminating 0
    stb $r_col , $r_cx              # move the cursor
    stb $r_char , $r_cell           # draw the character
    inc $r_ptr
    inc $r_col
    jmpi :next

done:
liw $r_addr , $BLIT
stb $r_addr , $r_addr               # show what was drawn

liw $r_addr , $KB_STATUS
wait:
    ldb $r_addr , $r_char
    bzi $r_char , :wait             # loop until a key is waiting
hlt

message:
db 0x48 , 0x65 , 0x6C , 0x6C , 0x6F , 0x21 , 0      # "Hello!"
```

A few things to notice: the destination register always comes last, labels are defined with a trailing colon and referenced with a leading one, and `db` places raw bytes in the program (there are no string literals). The instructions themselves are listed on the [Bashputer page]({% link _projects/bashputer.md %}#instruction-set-architecture).

### Labels and Scopes

A label names the address of the next statement, and it can be used before it is defined. Scopes let the same label name be used in different parts of a program. Inside a scope, `:.name` searches the current scope first, then each enclosing scope, then the global labels:

```bassm
cali :countdown
hlt

!scope countdown
    lib r1 , 3
    loop:
        dec r1
        bnzi r1 , :.loop
    ret
!endscope
```

From outside the scope, the loop above is `:countdown.loop`.

### Compile-Time Arithmetic and Substitutions

An expression in parentheses is evaluated when the program is assembled, using Bash arithmetic on 64-bit signed integers. Expressions can include labels, so `( :end - :start )` gives the size of a block of code.

```bassm
lib r1 , ( 2 + 3 * 4 )
liw r2 , ( ( 1 << 40 ) | 0xFF )
lib r3 , ( 10 > 5 ? 1 : 0 )
```

`def` defines a substitution, and `$name` replaces it with its text. This is mostly used to give names to memory-mapped registers and to the general-purpose registers a program uses, which makes a big difference when there are 256 of them:

```bassm
def SCREEN = 64000
def FILL   = ( $SCREEN + 16 )
def r_addr = r6

liw $r_addr , $FILL
```

### Macros

A substitution with `@` parameters is a macro, and arguments are passed by name in square brackets. An argument can contain anything, including whole blocks of statements, and it can even be a mnemonic, so one macro can work with several different instructions. A macro that defines labels is automatically wrapped in its own scope, so it can be used as many times as needed.

That turned out to be enough to build structured control flow on top of raw branches. Below is the `when` macro from my Snake program, along with the keyboard handler that uses it. Passing `is=eq` drops an `eq` comparison into the macro body, and `do=` takes the block of code to run:

```bassm
# when[reg= , is= , val= , do=] - does @do if @reg is @is to the value in @val else does nothing
def when =
{
    @is @reg , @val , $r_cond
    bzi $r_cond , :.endif
    !scope
        @do
    !endscope
    endif:
}

def key_body = {
    ldb $r_kb_data_addr , $r_kb_data
    $when[reg=$r_kb_data , is=eq , val=$r_w , do={$change_dir[todir=$r_up , dx=$r_zero , dy=$r_neg_one]; jmpi :.keys_done}]
    $when[reg=$r_kb_data , is=eq , val=$r_a , do={$change_dir[todir=$r_left , dx=$r_neg_one , dy=$r_zero]; jmpi :.keys_done}]
    $when[reg=$r_kb_data , is=eq , val=$r_s , do={$change_dir[todir=$r_down , dx=$r_zero , dy=$r_one]; jmpi :.keys_done}]
    $when[reg=$r_kb_data , is=eq , val=$r_d , do={$change_dir[todir=$r_right , dx=$r_one , dy=$r_zero]; jmpi :.keys_done}]
    $when[reg=$r_kb_data , is=eq , val=$r_q , do={$peek[addr=$KB_CLEAR , reg=$r_unsafe] ; hlt}]

    ldb $r_kb_status_addr , $r_kb_status
}

def handle_keys = {
    ldb $r_kb_status_addr , $r_kb_status
    $while[reg=$r_kb_status , is=eq , val=$r_one , do=$key_body]
    keys_done:
}
```

Snake defines a whole family of these: `if`, `when`, and `while`, each with a variant that compares against an immediate value, plus a `fori` counting loop.

### Position-Independent Code

`!label_origin` makes all later label references relative to the current address. Combined with the `pc` instruction, which reads the address of the current instruction, and `sjo`, which sets the jump origin that the CPU adds to every jump, branch, and call target, this produces code that runs correctly wherever it is loaded:

```bassm
!label_origin
pc r1                   # r1 = the address of this instruction
sjo r1                  # add r1 to every jump, branch, and call

loop:
    jmpi :loop          # the target is relative, and JO makes it absolute
```

Loads and stores still use absolute addresses, so data reached through a label needs the origin added by hand.

### Writing Fast Code

The Bashputer's clock advances once per bus access, so the cost of an instruction is the number of bytes it occupies plus the number of bytes it reads or writes. That makes some very different-looking code equivalent in speed, and some innocent-looking code very expensive. A `JMPI` costs 9 clock cycles because its 8-byte target has to be fetched, while a `JMP` to a register costs 2, and a `CALI` and `RET` pair costs 26. Macros make it easy to inline code instead of calling it, and to load branch targets into registers once and reuse them in hot loops.

The FastSnake program is the result of applying those ideas to my Snake, and you can see the difference side by side on the [Bashputer page]({% link _projects/bashputer.md %}#results).

### Editor Support

The repo includes a VS Code extension that adds syntax highlighting for `.bassm` files, covering comments, mnemonics, registers, labels, scopes, substitutions, and macro parameters. To install it, link it into your extensions folder from the root of the repository and restart VS Code:

```bash
ln -s "$PWD/Assembler/Assembly Extension" ~/.vscode/extensions/bassm-syntax
```

### Example Programs

The source for every included program is in `Assembler/Examples/`. I wrote Snake and the Fibonacci printer. FastSnake is my Snake optimized by Claude, and Claude also wrote Pong, FastPong, a Towers of Hanoi solver, a maze generator, and a Showcase program that tours the language's features. Each one can be assembled and run with the commands above.

### Implementation

The assembler is written in <a href="https://www.gnu.org/software/bash/manual/bash.html">Bash</a>, and the syntax highlighting is a VS Code TextMate grammar. I wrote the assembler, and I developed the VS Code extension from drafts and a walkthrough by Claude. The repo's README lists exactly which files used AI and how.

<style>
  /* Bassm colors come from assets/js/bassm-highlight.js and follow the site's light/dark theme */
  .language-bassm span {
    color: var(--shiki-light);
  }
  html[data-theme="dark"] .language-bassm span {
    color: var(--shiki-dark);
  }
</style>

<script type="module" src="{{ '/assets/js/bassm-highlight.js' | relative_url }}"></script>
