---
layout: page
title: LMM Metal 3D Printer
description: a low-cost lithography-based metal manufacturing printer (work in progress)
img: assets/img/projects/personal/lmm_printer/thumbnail_placeholder.png
importance: 3
category: personal
related_publications: false
---

<style>
  /* Temporary image placeholders: swap each one for a figure.liquid include once the photo is in assets/img/projects/personal/lmm_printer/ */
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

Note: This project is a work in progress. The printer has not produced a finished metal part yet. So far the results are the machine itself and a series of slurry tests. This page covers how the process works, how the machine is designed, and what I have learned along the way, and I will keep updating it as the build moves forward. The code (Teensy firmware, Raspberry Pi software, and Pi setup scripts) is on GitHub <a href="https://github.com/AndrewMasker/metal-resin-printer">here</a>.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> hero photo of the current prototype printer, ideally a three-quarter view showing the frame, reservoir, recoater, and projector.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/machine_overview.jpg</code>
</div>
<div class="caption">
    Fig. 1. The current prototype.
</div>

### Useful Skills/Topics Learned

Onshape, KiCad PCB design and bring-up, Teensy/C++ firmware, Python, Raspberry Pi Linux configuration, PID temperature control, heat transfer, DLP optics, photopolymer and wax binder chemistry, powder suspension rheology, debinding and sintering

### Background / Motivation

Lithography-based Metal Manufacturing (LMM) is the metal version of lithography-based ceramic manufacturing (LCM). Fine metal powder is mixed into a photopolymer binder, the mixture is cured layer by layer with light like a resin printer, and the binder is then removed and the powder sintered into solid metal. The result is fine detail and smooth surfaces, closer to metal injection molding (MIM) than to laser powder-bed fusion.

Commercial LMM machines, from companies like Incus and Lithoz, are priced for industrial labs. The hardware the process actually needs is fairly simple, though: a projector, a few lead-screw axes, and some heaters. I am building this printer mostly to experiment with the process, but also to show that these machines can be made cheaply.

### How It Works

The printer is a top-down, heated-paste machine, similar in concept to the Incus approach. Its "resin" is a slurry of metal powder in a binder made of two phases:

- a **meltable wax**, which keeps the slurry fluid when warm and solid at room temperature, and
- a **UV-curable acrylate photopolymer**, which crosslinks under 405 nm light and holds each layer together.

A piston pushes slurry up out of a heated reservoir, and a heated recoater blade drags it across the build platform as a thin, flat layer. A DLP projector then cures the layer's cross-section from above. Repeating this builds a "green" part, which is still mostly binder by volume and not yet metal.

To become metal, the green part is debound and then sintered. First a solvent (an aliphatic like heptane) dissolves the wax, leaving the cured resin intact and opening pore channels. Next, thermal debinding burns out the remaining resin. Last, the part is sintered in a furnace, where the powder fuses into dense metal and the part shrinks.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> process diagram showing slurry → recoat → expose → repeat → green part → debind → sinter → metal part (a sketch or annotated photo works).<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/process_diagram.png</code>
</div>
<div class="caption">
    Fig. 2. The LMM process, from slurry to sintered part.
</div>

The firmware runs each layer as follows:

1. The reservoir piston rises by 1.1× the layer thickness, leaving a little extra slurry for the blade.
2. The recoater blade sweeps across, leveling a fresh layer over the build plate.
3. The projector exposes the layer. The projector is double-buffered, so the next layer's image loads in the background during exposure.
4. The build platform drops by one layer thickness and the recoater returns home.

### CAD

I designed the machine in Onshape. The frame is built from 20 × 20 aluminum extrusion, aluminum and stainless plate, and linear rails. I picked these so the machine can be built in a small shop with a low bill of materials. There are three motion axes, all lead-screw driven by 200-step steppers with limit switches for homing:

<table class="spec-table">
  <tr><th>Axis</th><th>Job</th><th>Lead</th><th>Travel</th></tr>
  <tr><td>Reservoir</td><td>Piston pushes slurry up for each layer</td><td>4 mm/rev</td><td>~185 mm</td></tr>
  <tr><td>Build</td><td>Platform steps down one layer at a time</td><td>4 mm/rev</td><td>~185 mm</td></tr>
  <tr><td>Recoater</td><td>Heated blade sweeps slurry across the deck</td><td>8 mm/rev</td><td>~200 mm</td></tr>
</table>

<div class="img-placeholder">
  <strong>Image placeholder:</strong> Onshape render of the full machine assembly.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/cad_full_assembly.png</code>
</div>
<div class="caption">
    Fig. 3. Full machine assembly in Onshape.
</div>

The build deck is a fixed aluminum top plate with two rectangular openings, one for the reservoir and one for the build platform. A removable stainless plate with matching openings sits on top of it. Swapping in a stainless plate with smaller openings reduces the feedstock wasted on small prints. The reservoir is about 130 × 70 mm and shares one long wall with the build chamber. That shared wall became important later, when heating the slurry turned out to be the hardest problem on the machine (see [Hardware Iterations](#hardware-iterations-heating-the-slurry)).

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> CAD section view of the reservoir, piston, and build platform side by side under the deck.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/cad_reservoir_build_section.png</code>
        </div>
    </div>
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> CAD close-up of the recoater carriage and heated blade.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/cad_recoater.png</code>
        </div>
    </div>
</div>
<div class="caption">
    Fig. 4. Left: reservoir and build platform. Right: recoater carriage.
</div>

The print engine is the DLP light engine from an Elegoo Mars 4 DLP printer (2560 × 1440 pixels). I chose DLP over an LCD mask because an LCD has to sit almost in contact with the material, which does not work against a heated paste. A projector works from a distance, so the optics stay clear of the heat. The mounting geometry (throw distance, projector position, and focus tolerance) was worked out in CAD.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> CAD view (or photo) of the projector mount above the build area, ideally showing the throw path.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/cad_projector_mount.png</code>
</div>
<div class="caption">
    Fig. 5. Projector mounting above the build platform.
</div>

Before settling on this layout, I looked at several other ways to spread a peanut-butter-thick paste into layers around 100 µm, including tape casting, doctor blades, slot-die coating, and roll-to-roll casting. I also studied piston feeding of wax-based feedstock (the force needed to push a slug through a tube), compared peristaltic pumps (a poor fit for viscous feedstock), checked deflection of the stainless plate, and sized fasteners for the rails.

### Electronics

Control is split between two boards. A Raspberry Pi Zero W runs the print job, drives the projector, and runs the user interface. A Teensy 4.0 handles the real-time work: stepper motion, heater control loops, and sensor reads. They talk over UART, with USB as a fallback.

#### Prototype vs. Custom PCB

I first built the electronics on breadboards with off-the-shelf modules (the Teensy, the Pi, DRV8825 stepper driver carriers, and so on) to prove out the architecture and firmware. In that phase I measured the chamber air and the recoater blade with DS18B20 digital temperature sensors, but reading them caused hitches in the motor movement, so I switched to analog thermistors. (The same issue shaped the later infrared sensor driver, which only reads while the axes are idle.) Once the prototype worked, I designed a carrier PCB in KiCad and had it manufactured. The PCB holds everything the breadboards did, in a form that can actually live inside the machine.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of the breadboard prototype electronics.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/electronics_breadboard.jpg</code>
        </div>
    </div>
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of the assembled custom PCB, ideally framed the same way as the breadboard photo for comparison.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/electronics_pcb_assembled.jpg</code>
        </div>
    </div>
</div>
<div class="caption">
    Fig. 6. Left: breadboard prototype. Right: the custom PCB that replaced it.
</div>

<div class="img-placeholder">
  <strong>Image placeholder:</strong> KiCad PCB layout or 3D render of the board (and/or a schematic snippet).<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/pcb_kicad_layout.png</code>
</div>
<div class="caption">
    Fig. 7. The PCB layout in KiCad.
</div>

The PCB carries:

- the Teensy 4.0 and the Raspberry Pi Zero W,
- three DRV8825 stepper drivers with configurable microstepping,
- MOSFET heater outputs,
- thermistor inputs (100 kΩ NTC, B = 3950, with 50 kΩ pull-ups),
- limit-switch inputs and a header for an infrared temperature sensor,
- an onboard buck regulator that makes the 5 V rail from the 12 V supply.

Bringing up the board taught me a lot. On first power-up, the 5 V rail measured 12 V. I traced it with step-by-step measurements to an open feedback path. One feedback resistor had never been soldered, so the regulator was running flat out. I tested the Teensy and Pi separately before reconnecting them. A pin-by-pin cross-check of the netlist against the firmware also turned up a pair of swapped heater pins, a limit switch missing its pull-up, and a projector interrupt pin that had moved. All of these have been fixed.

#### Firmware and Software

The Teensy firmware is written in C++:

- Motion uses AccelStepper, and homing has a fast pass, a slow pass, and a back-off.
- Two time-proportioned PID heater loops (QuickPID) control the reservoir walls and the recoater blade. Each loop has a hard temperature window, and the heater is only allowed on while its limit sensor reads inside that window. For the reservoir, the limit sensor is a separate thermistor on the wall, not the control sensor.
- I wrote a bit-banged I2C/SMBus driver for the MLX90614 infrared thermometer, with PEC (CRC-8) checking. It reads only while all axes are idle, so the sensor reads never make the steppers stutter.
- A serial command protocol connects it to the Pi.

The Pi runs a Python package, `lmm_printer`:

- A `Print_Session` core handles homing, moves, file loading, printing, and safe shutdown. Heaters are always turned off on errors and exits, and the printer state is saved so a job can be resumed.
- There are two front ends over one interface: a command line and an on-machine GUI. The GUI draws with pygame into the framebuffer of a 240 × 240 ST7789 SPI screen and is driven by a rotary encoder. It has a menu tree (move, home, select file, print), a notification area, and a live status panel with temperatures and positions. During a print the UI runs on its own thread and hands commands to the printer thread through a queue.
- Settings such as slurry and recoater temperatures, layer overfill, and display layout live in one YAML config.
- A single `setup.sh` script turns a fresh Raspberry Pi OS Lite card into the printer's controller. It installs packages, sets up the Python environment, renders the boot config from the YAML file, loads kernel modules, and sets up a systemd service that boots straight into the GUI. USB drives mount automatically, so print files can be loaded from a stick.

The projector is driven over SPI using code from the open-source <a href="https://github.com/openMLA/elegoo-mars-4-dlp-controller">openMLA Elegoo Mars 4 DLP controller</a> project, which is vendored into the repository under its MIT license. Many thanks to the openMLA project for that work.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> photo of the 240 × 240 GUI screen and rotary encoder on the machine, showing the menu and status panel.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/gui_screen.jpg</code>
</div>
<div class="caption">
    Fig. 8. The on-machine GUI.
</div>

### The Slurry

The slurry is where most of the materials work has gone. The long-term target is about 67 vol% metal powder, with a binder that is mostly low-melting wax plus enough UV-curable resin to hold the green part together. The two phases have to work together. Paraffin and UV resin do not react, but they do interact physically through swelling and interference at the cure boundary, so how well they mix became its own problem. A wax that is itself UV-cured does not work, because the wax phase has to stay meltable and soluble for debinding. The polyethylene-backbone binders used in MIM also do not carry over to LMM.

#### Iterations

1. **Paraffin plus off-the-shelf printer resin.** This was the starting point. It showed the basic trade-off: more wax lowered viscosity but raised the melting point, and more resin did the reverse.
2. **Rethinking the resin.** Commercial printer resins are heavy in oligomers. A binder built mostly from monomers (a monofunctional acrylate, a crosslinker such as HDDA, and a TPO photoinitiator) gives lower viscosity and cleaner burnout. I also looked at lower-melting waxes (coconut wax, myristyl myristate, fatty alcohols), at reactive waxy monomers like stearyl acrylate, and at compatibilizers to help the wax and resin mix.
3. **UV inkjet varnish.** The "hard" (crosslinking) varnish sold for flatbed UV printers turned out to be close to that monomer-heavy recipe, easy to buy, and curable at 405 nm. The current blend is UV varnish, a coconut and paraffin wax mix, and copper powder, with stearic acid as a dispersant. It melts at about 40 °C and is printed warm.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of early slurry batches (e.g. paraffin + printer resin).<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/slurry_early.jpg</code>
        </div>
    </div>
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of the current copper / UV varnish / wax slurry, ideally melted to show how it flows.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/slurry_current.jpg</code>
        </div>
    </div>
</div>
<div class="caption">
    Fig. 9. Left: early slurry tests. Right: the current copper slurry.
</div>

#### The Current Bottleneck: The Powder

At 50 vol% copper, the slurry was still too thick to spread, even with a thin binder. The copper I am using is 325-mesh irregular powder sold for cold casting, not the spherical gas-atomized powder used in industry. I measured its tap-density packing fraction at 0.49, which means 50 vol% sits right at its packing limit. A Krieger–Dougherty viscosity estimate suggests that dropping to 40–45 vol% should cut viscosity by roughly 10×, so that is the next working range. Spherical powder is the long-term route to higher loadings.

The dispersant dose is also being revisited. A stearic-acid monolayer on this copper needs only about 0.02–0.1% of the powder mass, well below the 0.4% I had been using. Rather than assume more is better, the plan is to test a range around it.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> close-up of the irregular copper powder (microscope photo if available), or the tap-density measurement setup.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/copper_powder.jpg</code>
</div>
<div class="caption">
    Fig. 10. The 325-mesh irregular copper powder.
</div>

### Hardware Iterations: Heating the Slurry

The slurry is solid at room temperature, so heat is what makes it printable, and it has to stay below about 80 °C. Getting enough heat into a dense metal paste has been the main hardware challenge. One hard constraint shaped every version: nothing near the material may emit UV, or the slurry starts curing before it is exposed.

**Version 1: PTC air heating.** The first version heated the air in the build chamber with a PTC heater. A thermistor measured the air temperature, and the control loop assumed the slurry would track it. That assumption proved wrong. Air moves heat poorly into a dense, metal-filled paste, so the air could be at temperature while the slurry stayed solid.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> photo of the PTC chamber heater and the air thermistor.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/heating_v1_ptc.jpg</code>
</div>
<div class="caption">
    Fig. 11. Version 1: heating the chamber air with a PTC heater.
</div>

**Version 2: measure the slurry, heat the reservoir walls.** Version 2 fixed what the loop measures and where the heat goes:

- The control sensor changed from the air thermistor to an MLX90614ESF-DCI infrared thermometer (the narrow 5° field-of-view variant) aimed at the slurry surface, so the loop tracks the material itself. If its reading goes stale for 60 s, the heater shuts off.
- Adhesive polyimide heater pads went onto the reservoir walls, powered and PID-controlled through the terminals the PTC heater had used.
- The PTC heater was switched to always on, for background warmth.
- The old air thermistor moved onto the reservoir wall as a safety limit, because wall heaters can get hotter than the slurry is allowed to.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of the reservoir with the polyimide heater pads on its walls.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/heating_v2_polyimide.jpg</code>
        </div>
    </div>
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of the MLX90614 IR thermometer mounted above the slurry.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/heating_v2_ir_sensor.jpg</code>
        </div>
    </div>
</div>
<div class="caption">
    Fig. 12. Version 2. Left: polyimide heater pads on the reservoir walls. Right: the IR thermometer aimed at the slurry.
</div>

Version 2 got the control strategy right but not the power. I ran heat-conduction simulations of warm-up time across wall temperatures, reservoir sizes, slurry melting points, and three-wall versus four-wall heating. Because the reservoir shares a wall with the build chamber, only three of its walls can be heated. The simulations and the machine agreed: the polyimide pads did not have enough power. This was a power problem, not a firmware bug.

**Version 3: mains cartridge heaters.** The current version uses four 100 W, 110 V cartridge heaters. They sit in fittings I machined from aluminum linear-rail shaft supports, and the fittings are bonded to the reservoir walls with JB Weld. The heaters run from wall power. The 12 V signal that drove the polyimide pads now switches a solid-state relay (SSR), which in turn switches the heaters, so the Teensy's control loop and the IR sensing carried over unchanged. The wall thermistor still acts as the safety limit. The firmware only lets the heaters run while the wall reads between 0 and 100 °C, so an overheating wall, or a shorted or open sensor reading outside that window, cuts the power.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of the machined shaft-support fittings with cartridge heaters, bonded to the reservoir walls.<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/heating_v3_cartridges.jpg</code>
        </div>
    </div>
    <div class="col-sm mt-3 mt-md-0">
        <div class="img-placeholder">
          <strong>Image placeholder:</strong> photo of the SSR and mains wiring for the heaters (or a before/after of a shaft support being machined into a fitting).<br>
          Suggested file: <code>assets/img/projects/personal/lmm_printer/heating_v3_ssr.jpg</code>
        </div>
    </div>
</div>
<div class="caption">
    Fig. 13. Version 3. Left: cartridge heaters in machined fittings on the reservoir. Right: SSR switching from wall power.
</div>

This version works: the cartridge heaters keep the slurry molten throughout printing. In fact it worked a little too well. On one test run the slurry got runny enough to drain out through a previously unused screw hole in the reservoir, so I filled that hole with JB Weld.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> photo of the slurry that drained from the unused screw hole, and/or the JB Weld fill.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/heating_v3_leak.jpg</code>
</div>
<div class="caption">
    Fig. 14. Too much of a good thing: slurry that drained through an unused screw hole once the cartridge heaters were in.
</div>

The recoater blade is heated separately, by three 3D-printer heater cartridges on the back of the blade, and it uses two thermistors. The one on the back, next to the cartridges, runs the PID loop and acts as its safety limit. The one on the front of the blade acts as a gate: the Pi waits until the front of the blade is within a set window of its target before printing (and, likewise, until the IR sensor shows the slurry is up to temperature). Each sensor fails on its own. Controlling from the back alone, the cartridge blocks reach the setpoint but the blade itself, with its high thermal mass, never does. Controlling from the front alone, the loop has so much lag that it overshoots badly. Splitting the roles gives a fast, stable loop and a blade that is actually at temperature when it touches the slurry.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> photo of the recoater blade showing the heater cartridges and back thermistor, and the front thermistor.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/recoater_blade_heating.jpg</code>
</div>
<div class="caption">
    Fig. 15. The heated recoater blade: cartridges and control thermistor on the back, gating thermistor on the front.
</div>

### Post-Processing: Debinding and Sintering

For sintering, I converted a VEVOR tabletop kiln (rated to about 1,200 °C). My first attempt kept the stock controller and drove it with my own firmware that pressed its buttons. That turned out to be a dead end: the button presses were unreliable, and a kiln that might not do what it was told was potentially unsafe. Instead I removed the stock controller and replaced it with an Auber Instruments ramp/soak PID controller. That lets an off-the-shelf melting kiln run the slow, staged heating profiles that debinding and sintering need. Parts are packed in activated carbon inside an alumina crucible, and the carbon consumes the oxygen around the part. At 1,200 °C this setup suits copper and bronze. Since the printer has not made a green part yet, the kiln has not fired a printed part either.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> photo of the converted kiln with its Auber controller (and the carbon-packed crucible if you have one).<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/kiln.jpg</code>
</div>
<div class="caption">
    Fig. 16. The converted tabletop kiln used for sintering.
</div>

Further out, I plan to build a dedicated 1,500 °C furnace: a cast alumina muffle with silicon carbide heating elements, SCR power control, a type S or B thermocouple, an argon purge at slight positive pressure, and an oxygen-depletion monitor. A 1,500 °C limit covers steel, copper, bronze, and tungsten carbide (WC-Co). Carbide is hard to make in complex shapes any other way, which makes it the most interesting target. Carbon burial works for copper, bronze, and plain steel, but not for carbide, so the argon atmosphere stays in the long-term design.

### Results So Far

There is no finished part yet. Here is where things stand:

- **The machine.** The prototype is built, with the custom PCB, Teensy firmware, and Pi software running together. That includes three-axis motion with homing, projector control, the on-machine GUI, and closed-loop heating with hard safety cutoffs.
- **The slurry.** Through several formulation iterations, I have arrived at a copper / UV varnish / wax slurry that melts at about 40 °C. I have also identified the powder's packing limit (0.49 tap density) as what caps the metal loading for now.
- **Heating.** Three heating versions taught me that the slurry has to be measured directly and heated through the reservoir walls, not through the air, and that it takes far more power than the first wall heaters gave. The current version, four 100 W mains cartridge heaters switched by an SSR, keeps the slurry molten throughout printing.

<div class="img-placeholder">
  <strong>Image placeholder:</strong> any slurry test results worth showing, e.g. a melt test, a spread or drawdown test, or a side-by-side of batches at different loadings.<br>
  Suggested file: <code>assets/img/projects/personal/lmm_printer/results_slurry_tests.jpg</code>
</div>
<div class="caption">
    Fig. 17. Slurry test results.
</div>

### Lessons Learned

- **Heat the material, not the air.** A dense metal paste needs conductive heating and a sensor looking at the paste itself.
- **Powder shape matters as much as binder chemistry.** Cheap irregular powder caps how much metal the slurry can hold, no matter how thin the binder is.
- **Build safety into the firmware from the start.** Every heater has a hard temperature cutoff (on its own wall thermistor for the reservoir), the IR loop shuts off on stale readings, and all heaters turn off on any error or exit.
- **Measure before assuming.** Both the 12 V on the 5 V rail and the underpowered heaters looked at first like they might be firmware problems. Careful measurement and simple modeling found the real causes quickly.

### Next Steps

1. Settle the copper loading at 40–45 vol% and tune the dispersant dose. Source spherical powder for higher loadings.
2. Spread and cure the first layers on the machine, then print the first multi-layer green parts and measure layer quality.
3. Run the first debinding and sintering cycles in the converted kiln.
4. Build the 1,500 °C argon furnace and move from copper to steel, bronze, and tungsten carbide.

### Implementation

All of the code is on GitHub <a href="https://github.com/AndrewMasker/metal-resin-printer">here</a>. The Teensy firmware is in `Teensy_Firmware`, the Python print stack (`lmm_printer`) is in `src`, the Raspberry Pi setup script and system configuration are in `pi`, and the machine settings are in `config/config.yaml`. The projector driver is vendored from the <a href="https://github.com/openMLA/elegoo-mars-4-dlp-controller">openMLA Elegoo Mars 4 DLP controller</a> project.
