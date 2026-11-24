---
layout: page
title: LMM Metal 3D Printer
description: a low-cost lithography-based metal manufacturing printer (work in progress)
img: assets/img/projects/personal/lmm_printer/thumbnail.png
importance: 3
category: personal
related_publications: false
figure_dir: assets/img/projects/personal/lmm_printer
---

<style>
  /* Placeholder boxes from _includes/figure_slot.liquid. They only render in a local preview, never on the live site. */
  .img-placeholder {
    border: 2px dashed var(--global-text-color-light);
    border-radius: 0.5rem;
    padding: 2.5rem 1rem;
    margin-top: 1rem;
    text-align: center;
    color: var(--global-text-color-light);
    font-size: 0.9rem;
  }
  .img-placeholder code {
    font-size: 0.8rem;
  }
  /* Borderless spec tables */
  .spec-table {
    width: 100%;
    margin-bottom: 1rem;
  }
  .spec-table th,
  .spec-table td {
    padding: 0.2rem 0.5rem;
    vertical-align: top;
  }
</style>

<!--
Photos: each figure_slot below appears on the live site as soon as its file is in
assets/img/projects/personal/lmm_printer/ under the listed name. Until then it is hidden
on the live site and shows as a dashed placeholder in a local preview.
-->

Note: This project is a work in progress, and the printer has not produced a finished metal part yet. So far the results are the machine itself, a series of slurry tests, and some test runs of the printer. This page covers how the process works, how the machine is designed, and what I have learned along the way. I will keep updating it as the build moves forward. The code (Teensy firmware, Raspberry Pi software, and Pi setup scripts) is on GitHub <a href="https://github.com/AndrewMasker/metal-resin-printer">here</a>.

{% include figure_slot.liquid file="Printer_Hero.jpg" width="5" file2="CAD_Full_Perspective.png" width2="7" caption="The current prototype (left) and the full machine in Onshape (right)." %}

### Useful Skills Learned/Used

Onshape CAD, KiCad PCB design and board bring-up, embedded C++ (Teensy), Python, Raspberry Pi Linux configuration, I2C/SMBus and SPI peripherals, PID temperature control, heat transfer estimation, mains heater wiring with SSRs, machining, DLP optics, photopolymer and wax binder formulation, powder suspension rheology, debinding and sintering process design

### Background / Motivation

Lithography-based Metal Manufacturing (LMM) is a binder based metal 3D printing technique. A fine metal powder is mixed into a photopolymer binder, which is then cured layer by layer with light, much like a standard resin printer. Afterwards, the binder is removed and the powder is sintered into solid metal. The result is a part with fine detail and smooth surfaces; much closer to metal injection molding (MIM) quality than to laser powder-bed fusion.

Unfortunately, commercial LMM machines, such as those from Incus, are priced for industrial labs, even though the hardware the process actually needs is fairly simple: a projector, a few lead-screw axes, and some heaters. I am building this printer mostly to experiment with the process, but also to show that these machines can be made cheaply.

### How It Works

The printer is a top-down, heated-paste machine, similar in concept to the Incus approach. Rather than a liquid resin, the machine uses a slurry of metal powder within a binder made primarily of two substances:

- a **meltable wax**, which keeps the slurry fluid when warm and solid at room temperature, and
- a **UV-curable acrylate photopolymer**, which crosslinks under 405 nm light and holds each layer together.

A piston pushes slurry up out of a heated reservoir, and a heated recoater blade drags it across the build platform as a thin, flat layer, which a DLP projector then cures from above. Repeating this process builds up a "green" part, which still contains cured binder and is not yet solid, sintered metal. The firmware runs each layer as follows:

1. The reservoir piston rises by 1.1× the layer thickness, leaving a little extra slurry for the blade.
2. The recoater blade sweeps across, leveling a fresh layer over the build plate.
3. The projector exposes the layer (the projector is double-buffered, so the next layer's image loads in the background during exposure).
4. The build platform drops by one layer thickness and the recoater returns home.

To become metal, the green part must be debound and then sintered. In the two-step approach, a solvent (like heptane) first dissolves the wax, leaving the cured resin intact while opening up pore channels, and thermal debinding then burns out the remaining resin. Alternatively, one may skip the solvent step entirely and remove the wax thermally as well, in the same slow heating cycle that burns out the resin; thermal-only debinding is the plan for my first runs. Finally, the part is sintered in a furnace, where the powder fuses into dense metal and the part shrinks.

{% include figure_slot.liquid file="process_diagram.png" alt="Cross-section schematic of the printer next to the debinding and sintering steps" caption="The LMM process (schematic, not to scale). Left: printing a green part, with numbers matching the layer steps above. Right: turning it into metal." %}

### Machine Design

I designed the machine in Onshape with the goal of keeping it buildable in a small shop with a low bill of materials. As such, the frame is 20 × 20 aluminum extrusion, every plate except the recoater blade is aluminum, and the recoater rides on MGN9 linear rails. There are three motion axes, all of which are lead/ball-screw driven by 200-step steppers with limit/optical switches for homing:

<table class="spec-table">
  <tr><th>Axis</th><th>Job</th><th>Lead</th><th>Travel</th></tr>
  <tr><td>Reservoir</td><td>Piston pushes slurry up for each layer</td><td>4 mm/rev</td><td>~185 mm</td></tr>
  <tr><td>Build</td><td>Platform steps down one layer at a time</td><td>4 mm/rev</td><td>~185 mm</td></tr>
  <tr><td>Recoater</td><td>Heated blade sweeps slurry across the deck</td><td>8 mm/rev</td><td>~200 mm</td></tr>
</table>

{% include figure_slot.liquid file="Piston_Section_View_Perspective.png" width="4" caption="Section through the machine. The reservoir piston and build platform each ride on their own lead screw below the deck, with the recoater and projector above." %}

The build deck is a fixed aluminum plate with two rectangular openings, one for the reservoir and one for the build platform. I originally considered a removable top plate that could be swapped for one with smaller openings in order to waste less feedstock on small prints, but I ended up dropping it. It added quite a bit of of complexity and a similar idea may already be patented; that of course wouldn't have stopped a one-off build that isn't for sale, but it didn't really fit the spirit of the project. The reservoir is about 130 × 70 mm and shares one long wall with the build chamber, which became important later on when heating the slurry turned out to be the hardest problem on the machine (see [Heating the Slurry](#heating-the-slurry)).

{% include figure_slot.liquid file="Chamber_View_General_Recoater_PTC_Heater.jpg" file2="Recoater_Close_Up.png" caption="The deck. Left: on the machine, with the reservoir piston in the left opening, the build platform in the middle, the recoater carriage at the left with its lead screw along the back, and the PTC heater and fan on the right. Right: the recoater carriage on its rails in CAD." %}

The reservoir piston and the build platform each move vertically inside their own opening. Originally, each one was guided by V-wheels pressed into the corners of its opening, which unfortunately proved unreliable in several ways. I replaced the wheels with a slightly oversized TPU fitting around each platform, which constrains its motion against the walls. In a future build, it may make sense to replace this with a machines PTFE fitting.

{% include figure_slot.liquid file="V-Wheel_Aligner_Section_Perspective.png" file2="TPU_Aligner_Section_Perspective.png" caption="Platform guidance, in section. Left: the original V-wheels in the corners of the openings. Right: the TPU fittings that replaced them." %}

The print engine is the DLP light engine from an Elegoo Mars 4 DLP printer (2560 × 1440 pixels). I chose DLP over an LCD mask because an LCD has to sit essentially in contact with the material, which would likely prove difficult with a paste. There is also the issue of green part strength being very low, which may result in breaking due to suction between the LCD and the slurry. On the other hand, a projector works from a distance and keeps the optics clear of the heat which is quite desireable for this build. I measured the Mars 4 DLP and worked out the mounting geometry (throw distance, projector position, and focus) in CAD from those measurements.

{% include figure_slot.liquid file="Projector_Aa_Visual_Prspective.png" caption="The projector mount above the deck. The pink lines trace the light path through the glass window in the top plate onto the build platform." %}

### Electronics

Control is split between two boards. A Raspberry Pi Zero W runs the print job, drives the projector, and runs the user interface, while a Teensy 4.0 handles the real-time work such as stepper motion, heater control loops, and sensor reads. The two talk over UART, with USB as a fallback.

#### Prototype vs. Custom PCB

I first built the electronics on breadboards with off-the-shelf modules (the Teensy, the Pi, DRV8825 stepper driver carriers, and so on) to prove out the architecture and firmware. During that phase I measured the chamber air and the recoater blade with DS18B20 digital temperature sensors; however, reading them caused hitches in the motor movement, so I switched over to analog thermistors.

{% include figure_slot.liquid file="Motor_Control_Prototype_Electronics_Closeup.jpg" file2="Pi_Breakout_And_Thermistor_Prototype_Electronics.jpg" caption="The breadboard prototype. Left: stepper drivers and motor control. Right: the Raspberry Pi breakout and thermistor circuits." %}

Once the prototype worked, I designed a carrier PCB in KiCad and had it made by JLCPCB. The PCB holds everything the breadboards did, but in a form that is less of a nest of jumper wires.

{% include figure_slot.liquid file="Prototype_Electronics.jpg" file2="PCB_Front_View.jpg" caption="On top of the machine. Left: the breadboard prototype. Right: the custom PCB that replaced it, with the Pi, the GUI screen, and the rotary encoder." %}

{% include figure_slot.liquid file="KiCad_Schematic.png" caption="The board schematic in KiCad." %}

{% include figure_slot.liquid file="KiCad_PCB_View.png" file2="KiCad_PCB_3D_View.png" caption="The PCB in KiCad. Left: the layout. Right: the 3D view." %}

The PCB carries:

- the Teensy 4.0 and the Raspberry Pi Zero W,
- three DRV8825 stepper drivers with configurable microstepping,
- MOSFET heater outputs,
- thermistor inputs (100 kΩ NTC, B = 3950, with 50 kΩ pull-ups),
- limit-switch inputs and a header for an infrared temperature sensor,
- an onboard buck regulator that makes the 5 V rail from the 12 V supply.

Bringing up the board actually taught me quite a lot about soldering and troubleshooting electronics. On first power-up, the 5 V rail measured 12 V, which wound up being a feedback resistor that had never been soldered, so the regulator was running flat out. There were also a few other things that needed to be troubleshooted, like a pair of swapped heater pins, a limit switch missing its pull-up, and a projector interrupt pin that had moved, all of which have since been fixed physically or from firmware.

{% include figure_slot.liquid file="PCB_Not_Assembled.jpg" file2="PCB_Top_View.jpg" caption="Left: the bare board from JLCPCB. Right: assembled, with the Teensy, Pi, and stepper drivers in place." %}

#### Firmware and Software

The Teensy firmware is written in C++:

- Motion uses AccelStepper, and homing has a fast pass, a slow pass, and a back-off.
- Two time-proportioned PID heater loops (QuickPID) control the reservoir walls and the recoater blade. Each loop has a hard temperature window (for safety), and the heater is only allowed on while its limit sensor reads inside that window. For the reservoir, the limit sensor is a separate thermistor on the wall, not the control sensor.
- I wrote a bit-banged I2C/SMBus driver for the MLX90614 infrared thermometer, with PEC (CRC-8) checking. Unlike the DS18B20s, I set it up so it only reads while all axes are idle, so sensor reads never make the steppers stutter.
- A serial command protocol connects it to the Pi.

The Pi runs a Python package, `lmm_printer`:

- A `Print_Session` core handles homing, moves, file loading, printing, and safe shutdown. Heaters are always turned off on errors and exits, and the printer state is saved so a job can be resumed.
- There are two front ends over one interface: a command line and an on-machine GUI. The GUI draws with pygame into the framebuffer of a 240 × 240 ST7789 SPI screen and is driven by a rotary encoder. It has a menu tree (move, home, select file, print), a notification area, and a live status panel with temperatures and positions. During a print the UI runs on its own thread and hands commands to the printer thread through a queue.
- Settings such as slurry and recoater temperatures, layer overfill, and display layout live in one YAML config.
- A single `setup.sh` script turns a fresh Raspberry Pi OS Lite card into the printer's controller; it installs packages, sets up the Python environment, renders the boot config from the YAML file, loads kernel modules, and sets up a systemd service that boots straight into the GUI. It also makes USB drives mount automatically, so print files can be loaded from a stick.

The projector is driven over SPI using code from the open-source <a href="https://github.com/openMLA/elegoo-mars-4-dlp-controller">openMLA Elegoo Mars 4 DLP controller</a> project, which is vendored into the repository under its MIT license. Many thanks to the openMLA project for that work and Nemo Andrea for his help.

{% include figure_slot.liquid file="UI_Panel.jpg" caption="The on-machine GUI on the 240 × 240 screen: the main menu, with the status and log panel below it." %}

### The Slurry

The slurry is where most of the materials work has gone. The long-term target is about 67 vol% metal powder, with a binder made of a low-melting wax plus just enough UV-curable resin to hold the green part together. Of course, the two binder phases have to actually work together. Wax and UV resin do not react, but they do not necessarily mix either, so miscibility ended up being one of the main problems.

#### Iterations

Every batch so far uses 325-mesh copper powder and stearic acid as a dispersant (plus oleic acid in the first two). I track each formula in a spreadsheet, recording the copper fraction by volume and the binder's makeup by mass.

<table class="spec-table">
  <tr><th>#</th><th>Copper</th><th>Binder (by mass)</th><th>Result</th></tr>
  <tr><td>1</td><td>50 vol%</td><td>71.5% Elegoo water-washable resin, 25% 122 °F wax blend, 2.5% stearic acid, 1% oleic acid</td><td>Resin and wax were immiscible, so I moved on to a different resin.</td></tr>
  <tr><td>2</td><td>50 vol%</td><td>Same, with Elegoo ABS-like resin instead of water-washable</td><td>Still immiscible on their own, but no separation once the copper was mixed in. Spreadable at around 45 °C, and hard but crushable at room temperature.</td></tr>
  <tr><td>3</td><td>50 vol%</td><td>81.5% ABS-like resin, 15% wax blend, 3.5% stearic acid</td><td>Melted at a lower temperature, but more viscous.</td></tr>
  <tr><td>4</td><td>50 vol%</td><td>71.5% UV ink, 12.5% wax blend, 12.5% coconut wax, 3.5% stearic acid</td><td>First mix with UV ink and coconut wax.</td></tr>
  <tr><td>5</td><td>40 vol%</td><td>Same binder as #4</td><td>Very spreadable, but separated, and the melting point may be on the high side.</td></tr>
  <tr><td>6</td><td>45 vol%</td><td>71.5% UV ink, 25% coconut wax, 3.5% stearic acid</td><td>Great flow and very little separation. Melting point lower, but still a little too high.</td></tr>
  <tr><td>7</td><td>45 vol%</td><td>84% UV ink, 12.5% coconut wax, 3.5% stearic acid</td><td>Latest formula: less wax, to bring the melting point down.</td></tr>
</table>

The first three formulas mapped out the basic trade-off with off-the-shelf printer resin; adding resin lowered the melting point but raised the viscosity, while adding wax did the reverse. That pointed to two changes, a lower-melting wax and a lower-viscosity UV-curable liquid. Coconut wax and UV ink (the kind used in UV printers) filled those roles starting with formula 4. By formula 6, coconut wax had fully replaced the 122 °F blend, which gave the best mix so far. Formula 7 cuts the wax further in an attempt to lower the melting point.

{% include figure_slot.liquid file="Current_Slurry_Room_Temp_Spread.mp4" file2="Current_Slurry_Heated.mp4" caption="The current slurry. Left: at room temperature it is a spreadable solid like slightly softened butter. Right: warmed, it spreads into a smooth layer." %}

#### Powder Loading

The first four formulas were all at 50 vol% copper, and they were quite thick. The copper I am using is 325-mesh irregular powder sold for cold casting, rather than the spherical gas-atomized powder used in industry. I measured its tap-density packing fraction at 0.49, which puts 50 vol% right at its packing limit which explained a lot of the problems I was having with spreadability. Dropping to 40–45 vol% cut the viscosity by a lot, which the later formulas bear out, as formulas 5 and 6 (at 40 and 45 vol%) were the first to spread and flow well. Unfortunately, getting back up toward the 67 vol% target will take spherical powder, which packs much more densely but is incredibly expensive.

The dispersant dose is also worth revisiting. In these formulas, stearic acid works out to roughly 0.3–0.6% of the powder mass, while a rough estimate of a stearic-acid monolayer on this copper puts the need at only about 0.02–0.1%. Rather than assuming that more is better, the plan is to test a range.

{% include figure_slot.liquid file="Early_Reduced_Powder_Vol_Spread_Test.mp4" caption="An early spread test after lowering the copper loading." %}

### Heating the Slurry

The slurry is solid at room temperature, so heat is what makes it printable, but it also has to stay below about 80 °C to avoid premature gelling. Getting enough heat into a dense metal paste has been the main hardware challenge.

**Version 1: PTC air heating.** The first version heated the air in the build chamber with a PTC heater, with a thermistor measuring the air temperature and the control loop assuming that the slurry would track it. That assumption unfortunately proved wrong. Air moves heat poorly into a dense, metal-filled paste, so the air could be sitting at temperature while the slurry stayed solid.

{% include figure_slot.liquid file="Air_Thermistor_Housing_with_Heatsink_Fins.jpg" caption="Version 1: the air thermistor, in a finned housing on the underside of the top plate next to the projector window. The PTC heater and fan are on the right of the deck photo above." %}

**Version 2: measure the slurry, heat the reservoir walls.** Version 2 fixed what the loop measures and where the heat goes:

- The control sensor changed from the air thermistor to an MLX90614ESF-DCI infrared thermometer (the narrow 5° field-of-view variant) aimed at the slurry surface, so the loop tracks the material itself.
- Adhesive polyimide heater pads went onto the reservoir walls, powered and PID-controlled through the terminals the PTC heater had used.
- The PTC heater was switched to always on, for background warmth.
- The old air thermistor moved onto the reservoir wall as a safety limit, because wall heaters can get hotter than the slurry is allowed to.

{% include figure_slot.liquid file="IR_Therm_Far_View.jpg" file2="IR_Therm_Closeup.jpg" caption="Version 2: the IR thermometer. Left: on the underside of the top plate next to the projector window, looking down at the slurry. Right: close-up of its housing." %}

Version 2 got the control strategy right, but not the power. Because the reservoir shares a wall with the build chamber, only three of its walls can be heated. Some rough heat-conduction estimates of warm-up time (across wall temperatures, reservoir sizes, slurry melting points, and three-wall versus four-wall heating) matched what the machine showed; the polyimide pads simply did not have enough power.

**Version 3: mains cartridge heaters.** The current version uses four 100 W, 110 V cartridge heaters running from wall power. They sit in fittings I machined from aluminum linear-rail shaft supports, which are bonded to the reservoir walls with JB Weld. The 12 V signal used to drive the polyimide pads now switches a solid-state relay (SSR), which in turn switches the heaters, so the Teensy's control loop and the IR sensing carried over unchanged. The wall thermistor still acts as the safety limit, and the firmware only lets the heaters run while the wall reads between 0 and 100 °C. That way an overheating wall, or a shorted or open sensor reading outside that window, cuts the power.

{% include figure_slot.liquid file="Cartridge_Heater_Front.jpg" file2="Cartridge_Heater_Side_And_Safetry_Therm.jpg" caption="Version 3: cartridge heaters in fittings machined from shaft supports and JB-Welded to the reservoir. Left: the front wall. Right: a side wall, with the safety thermistor." %}

{% include figure_slot.liquid file="SSR_Wiring.jpg" caption="The solid-state relay and mains inlet that switch the cartridge heaters from wall power." %}

This version works, and the cartridge heaters keep the slurry molten throughout printing. In fact, it worked a little too well; on one test run the slurry got runny enough to drain out through a previously unused screw hole in the reservoir, so that hole is now filled with JB Weld.

**The recoater blade.** The blade is heated separately by three 3D-printer heater cartridges on its back, and it uses two thermistors. The one on the back, next to the cartridges, runs the PID loop and acts as its safety limit, while the one on the front of the blade acts as a gate; the Pi waits until the front of the blade is within a set window of its target before printing (and, likewise, until the IR sensor shows the slurry is up to temperature). Interestingly enough, neither sensor works on its own. Controlling from the back alone, the cartridge blocks reach the setpoint but the blade itself either never does or it lags behind enough that it is still cold when the blade starts moving. That is mostly due to the high thermal mass of the blade. Controlling from the front alone, the loop has so much lag that it overshoots considerably. Splitting the roles gives a fast, stable loop and a blade that is actually at temperature when it touches the slurry.

### Post-Processing: Debinding and Sintering

For sintering, I converted a VEVOR tabletop kiln (rated to about 1,200 °C). My first attempt kept the stock controller and drove it with my own firmware+hardware controller that pressed its buttons, which turned out to be a dead end as the button presses were entirely unreliable. Instead, I removed the stock controller and replaced it with an Auber Instruments ramp/soak PID controller, which lets an off-the-shelf melting kiln run the slow, staged heating profiles that debinding and sintering need.

Parts are packed in activated carbon inside an alumina crucible, where the carbon consumes the oxygen around the part. At 1,200 °C, this setup suits copper and bronze. Of course, since the printer has not made a green part yet, the kiln has not fired a printed part either.

{% include figure_slot.liquid file="Kiln.jpg" file2="Kiln_Controller_Closeup.jpg" caption="Left: the converted VEVOR kiln. Right: the Auber ramp/soak controller that replaced the stock one." %}

Further out, I plan to build a dedicated 1,500 °C furnace with a cast alumina muffle, silicon carbide heating elements, SCR power control, a type S or B thermocouple, an argon purge at slight positive pressure, and an oxygen-depletion monitor. A 1,500 °C limit covers steel, copper, bronze, and tungsten carbide (WC-Co), and carbide is the most interesting target of those since it is hard to make in complex shapes any other way. Carbon burial works for copper, bronze, and plain steel, but not for carbide, so the argon atmosphere stays in the long-term design.

### Results So Far

There is no finished part yet, but here is where things currently stand:

- **The machine.** The prototype is built, with the custom PCB, Teensy firmware, and Pi software running together. That includes three-axis motion with homing, projector control, the on-machine GUI, and closed-loop heating with hard safety cutoffs.
- **The slurry.** Over seven formulations, I moved from off-the-shelf printer resin and a 122 °F wax blend to UV ink and coconut wax. At 45 vol% copper this flows well with little separation. The powder's packing limit (0.49 tap density) caps the metal loading for now.
- **Heating.** Three versions showed that the slurry has to be measured directly and heated through the reservoir walls, not through the air, and that it takes far more power than the first wall heaters gave. The current mains cartridge heaters keep the slurry molten throughout printing.

### Lessons Learned

- **Heat the material, not the air.** A dense metal paste needs conductive heating and a sensor looking at the paste itself.
- **Powder shape matters as much as binder chemistry.** Cheap irregular powder caps how much metal the slurry can hold, no matter how thin the binder is.
- **Build safety into the firmware from the start.** Every heater has a hard temperature cutoff (on its own wall thermistor for the reservoir), the IR loop shuts off on stale readings, and all heaters turn off on any error or exit.
- **Measure before assuming.** Both the 12 V on the 5 V rail and the underpowered heaters looked at first like they might be firmware problems. Careful measurement and simple modeling found the real causes quickly. Had I not done this I would have fried both the teensy and Pi.

### Next Steps

1. Settle the copper loading at 40–45 vol% and tune the dispersant dose. Source spherical powder for higher loadings.
2. Print the first multi-layer green parts and measure layer quality.
3. Run the first debinding and sintering cycles in the converted kiln.
4. Build the 1,500 °C argon furnace and move from copper to steel, bronze, and tungsten carbide.

### Implementation

All of the code is on GitHub <a href="https://github.com/AndrewMasker/metal-resin-printer">here</a>. The Teensy firmware is in `Teensy_Firmware`, the Python print stack (`lmm_printer`) is in `src`, the Raspberry Pi setup script and system configuration are in `pi`, and the machine settings are in `config/config.yaml`. The projector driver is vendored from the <a href="https://github.com/openMLA/elegoo-mars-4-dlp-controller">openMLA Elegoo Mars 4 DLP controller</a> project.
