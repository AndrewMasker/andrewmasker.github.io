---
layout: page
title: Bassm
description: an assembly language and assembler for the Bashputer, also written in Bash
img: assets/img/projects/personal/bassm/bassm_thumbnail.png
importance: 3
category: personal
related_publications: false
---

Note: Bassm is the assembly language for my <a href="{% link _projects/bashputer.md %}">Bashputer</a> virtual machine, so that page is the place to start if you haven't seen it. The assembler is in the `Assembler` folder of the repo <a href="https://github.com/AndrewMasker/Bashputer">here</a>, and the full language reference is the <a href="https://github.com/AndrewMasker/Bashputer/blob/master/docs/assembly-language.md">assembly language guide</a>.

### Useful Skills Learned/Used

Assembler design, macro preprocessing, Bash, low-level performance optimization, VS Code extensions, TextMate grammars

### Overview

The Bashputer runs programs stored as raw bytes, and writing those bytes by hand gets old very quickly. Bassm is the assembly language for the machine, and its assembler turns `.bassm` source files into cartridges the Bashputer can run. Like everything else in the project, the assembler is written in Bash, at about a thousand lines.

Bassm is a fairly small language, but it has a few features that make it much more pleasant to write than plain assembly:

- **Labels and scopes**, so the same label name can be reused in different parts of a program
- **Compile-time arithmetic**, evaluated with Bash arithmetic, including on label addresses
- **Substitutions and macros**, which are powerful enough to build structured control flow such as `if`{:.language-bassm} and `while`{:.language-bassm} out of raw branches
- **Label origins**, for writing code that runs correctly wherever it is loaded in memory

### The Assembler

The assembler runs in three stages, each its own script:

1. The **preprocessor** removes comments, splits lines into statements, and expands substitutions and macros.
2. The **processor** assigns an address to every statement, resolves labels, and evaluates arithmetic.
3. The **hexer** encodes each statement as bytes, using a table of opcodes and operand sizes.

The following command assembles `MyProgram.bassm` and outputs the cartridge as `src/Cartridges/MyProgram`. Running it with `-k` keeps the output of each stage, which is the quickest way to see what a macro actually expanded to.

```bash
bash Assembler/assembler.sh MyProgram.bassm -o src/Cartridges/MyProgram
```

The output is a cartridge, which is just a named folder containing a plain-text file called `hex`. Each line holds a starting address followed by up to 16 bytes, and when the Bashputer starts, the cartridge is copied into ROM and execution begins at address 0:

```text
0x0000000000000000 0x1F 0x2A 0x14 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x36 0x08 0x38 0x08 0x1F 0x1F
0x0000000000000010 0x67 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x28 0x1F 0x1F 0x06 0x48 0x00 0x00 0x00
```

To run the computer with that cartridge loaded as ROM, use the following command:

```bash
src/run.sh MyProgram
```

### A First Program

This program prints `Hello!` and waits for a key press. All of the screen and keyboard registers are memory-mapped, so drawing a character is just a matter of storing the column into the cursor register and the character into the cell register. Nothing appears on screen until the program writes to `BLIT`{:.language-bassm}.

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

A few things to notice: the destination register always comes last, labels are defined with a trailing colon and referenced with a leading one, and `db`{:.language-bassm} places raw bytes in the program (there are no string literals). The instructions themselves are listed on the [Bashputer page]({% link _projects/bashputer.md %}#instruction-set-architecture).

### Labels and Scopes

A label names the address of the next statement, and it can be used before it is defined. Scopes let the same label name be used in different parts of a program. Inside a scope, `:.name`{:.language-bassm} searches the current scope first, then each enclosing scope, then the global labels:

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

From outside the scope, the loop above is `:countdown.loop`{:.language-bassm}.

Scopes can also be anonymous, which allows for the separation of local and global labels without requiring the scope to take a global name, as seen below.

```bassm

!scope
    lib r1 , 3
    loop:
        dec r1
        bnzi r1 , :.loop
!endscope

!scope
    lib r1 , 3
    loop:
        dec r1
        bnzi r1 , :.loop # No conflict with the other loop
!endscope

```

### Compile-Time Arithmetic and Substitutions

An expression in parentheses is evaluated when the program is assembled, using Bash arithmetic on 64-bit signed integers. Expressions can include labels, so `( :end - :start )`{:.language-bassm} gives the size of a block of code.

```bassm
lib r1 , ( 2 + 3 * 4 )
liw r2 , ( ( 1 << 40 ) | 0xFF )
lib r3 , ( 10 > 5 ? 1 : 0 )
```

`def name`{:.language-bassm} defines a substitution called `name`{:.language-bassm}, and `$name`{:.language-bassm} is replaced by whatever text is assigned to that substitution. This is used to give names to memory-mapped registers and to the general-purpose registers a program uses, along with defining constants:

```bassm
def SCREEN = 64000
def FILL   = ( $SCREEN + 16 )
def r_addr = r6

liw $r_addr , $FILL

def width = 15
def r_width = r34

lib $r_width , $width
```

Substitutions can also be undefined using `undef`{:.language-bassm}:

```bassm
def r_A = r1
lib $r_A , 10 # Works

undef r_A
lib $r_A , 15 # Does not work
```

### Macros

A substitution with `@`{:.language-bassm} parameters is a macro, and arguments are passed by name in square brackets. An argument can contain anything, as it is simple textual replacement. That includes whole blocks of statements along with mnemonics, so one macro can work with several different instructions. If a macro defines labels, it is automatically wrapped in its own anonymous scope, so that multiple uses do not cause conflicting label names.

Given that the parameters are replaced with text substitution, the macros wind up being very powerful and allow for nicely structured code. For example, it is possible to build structured control flow on top of raw branches. Below is the `when`{:.language-bassm} macro from my Snake program, along with an example of its use. Passing `is=eq`{:.language-bassm} drops an `eq`{:.language-bassm} comparison into the macro body, and `do=`{:.language-bassm} takes the block of code to run:

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

lib r1 , 5
lib r2 , 5

# Will call print_message and then do the code defined in $do_some_inline_code
$when[reg=r1 , is=eq , val=r2 , do={cali :print_message; $do_some_inline_code}]

# Will not do what is in the do block, as r1 is not less than r2
$when[reg=r1 , is=lt , val=r2 , do={cali :print_message; $do_some_inline_code}]
```

Snake defines a whole family of these: `if`{:.language-bassm}, `when`{:.language-bassm}, and `while`{:.language-bassm}, each with a variant that compares against an immediate value, plus a `fori`{:.language-bassm} counting loop.

Macros can also be undefined in the same way that substitutions can, as macros and substitutions are really just the same thing, with substitutions just not taking any parameters.

### Position-Independent Code

`!label_origin`{:.language-bassm} makes all later label references relative to the current address. Combined with the `pc`{:.language-bassm} instruction, which reads the address of the current instruction, and `sjo`{:.language-bassm}, which sets the jump origin that the CPU adds to every jump, branch, and call target, this produces code that runs correctly wherever it is loaded:

```bassm
!label_origin
pc r1                   # r1 = the address of this instruction
sjo r1                  # add r1 to every jump, branch, and call

loop:
    jmpi :loop          # the target is relative to !label_origin (which points at pc r1), 
                        # and the jump origin makes it absolute
```

Loads and stores still use absolute addresses, so data reached through a label needs the origin added by hand.

### Writing Fast Code

The Bashputer's clock advances once per bus access, so the cost of an instruction is the number of bytes it occupies plus the number of bytes it reads or writes. That makes some very different-looking code equivalent in speed, and some innocent-looking code very expensive. A `JMPI`{:.language-bassm} costs 9 clock cycles because its 8-byte target has to be fetched, while a `JMP`{:.language-bassm} to a register costs 2, and a `CALI`{:.language-bassm} and `RET`{:.language-bassm} pair costs 26. Macros make it easy to inline code instead of calling it, and to load branch targets into registers once and reuse them in hot loops.

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
  /* Bassm code (fenced bassm blocks, and inline code tagged with the language-bassm class) is colored by
     assets/js/bassm-highlight.js with VS Code's Light 2026 theme in light mode and Dark 2026
     in dark mode. The background is transparent so it matches the page. */
  pre:has(> code.language-bassm),
  code.language-bassm {
    background-color: transparent;
  }
  /* Default text color: editor.foreground from assets/json/vscode-{light,dark}-2026.json.
     It also keeps the text readable if the script can't load. */
  code.language-bassm {
    color: #202020;
  }
  html[data-theme="dark"] code.language-bassm {
    color: #bbbebf;
  }
  code.language-bassm span {
    color: var(--shiki-light);
  }
  html[data-theme="dark"] code.language-bassm span {
    color: var(--shiki-dark);
  }
</style>

<script type="module" src="{{ '/assets/js/bassm-highlight.js' | relative_url }}"></script>
