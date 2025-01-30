# Slime Simulation Service

![slime](https://github.com/user-attachments/assets/443565d5-e0fa-45f3-b3f4-2b22f83392d6)



<p style="text-align: center">A WebGL slime simulation</p>

## Overview

This project implements a continuous version of cellular automata with physically-based rendering (PBR) to create a dynamic, liquid-metal effect. The simulation runs on the GPU using custom GLSL shaders and Three.js.

## Features

- Real-time simulation with mouse/touch interaction
- Physically-based rendering with customizable material properties
- Optional glass effect with chromatic aberration
- Image distortion capabilities
- Mobile-responsive with touch support
- Extensive GUI controls for real-time parameter adjustment

## Controls

### Simulation Parameters

| Parameter | Range | Description |
|-----------|--------|-------------|
| Resolution | 4-1024 | Controls the simulation resolution. Higher values increase detail but impact performance |
| Noise Factor | 0.0-1.0 | Amount of random noise added to the simulation |
| Birth Rate | 0.0-1.0 | Threshold for new cells to appear (similar to Conway's Game of Life) |
| Death Rate | 0.0-1.0 | Threshold for cells to disappear |
| Sustain Rate | 0.0-1.0 | How well existing cells maintain their state |
| Speed | 0.0-1.0 | Overall simulation speed |
| Sample Radius | 0-15 | How far each cell looks for neighbors |
| Growth Target | 0.0-100.0 | Maximum value for cell growth |
| Mouse Mass | 0.2-1.0 | Strength of mouse/touch interaction |
| Mouse Radius | 0.01-0.2 | Size of mouse/touch influence area |
| Gaussian Weight | 4-20 | Smoothness of neighbor sampling |

### Render Parameters

| Parameter | Range | Description |
|-----------|--------|-------------|
| Roughness | 0.05-0.95 | Surface roughness for PBR rendering |
| Metalness | 0-1 | Metallic quality of the surface |
| Tone Mapping | 1.8-2.4 | Overall brightness/contrast adjustment |
| Light Height | 1-3 | Height of the moving light source |
| Height Multiplier | 0.5-3 | Intensity of height displacement |
| Normal Multiplier | 1-8 | Strength of surface normal effects |
| Normal Z Strength | 0.2-1.5 | Vertical component of surface normals |

### Toggle Effects

- **Glass Effect**: Enables refractive distortion of background
- **Show Image**: Toggles background image visibility
- **Smooth Normals**: Enables normal smoothing based on height
- **Spotlight Dampening**: Adjusts specular highlights based on height

### Color Controls

- **Base Color**: Primary color of the simulation
- **Secondary Color**: Accent color with alpha control
- **Specular Color**: Color of highlights
- **Secondary Alpha**: Opacity of secondary color

## Performance Tips

1. Lower the resolution on mobile devices or weaker hardware
2. Reduce sample radius for better performance
3. Adjust noise factor and speed for desired fluidity
4. Balance between visual quality and performance using the GUI controls

## Technical Details

The simulation uses a ping-pong buffer technique with two render targets to update the state. The state consists of:
- Red channel: Mass/density
- Green channel: Velocity
- Blue channel: Height
- Alpha channel: Fixed at 1.0

The rendering pipeline implements PBR (Physically Based Rendering) with custom normal calculation and various material properties that can be adjusted in real-time.

## Browser Support

Requires WebGL 2.0 support. Tested on:
- Chrome
- Firefox
- Safari
- Mobile browsers (with reduced resolution)

## Dependencies

- Three.js
- lil-gui for controls
