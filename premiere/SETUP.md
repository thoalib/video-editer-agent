# Premiere MCP setup

Dependency: user-supplied Adobe Premiere Pro MCP archive, package version 1.2.8,
commit ee31c3def7c3ca1c68662ea7737a9f8e5a2b634f. Its MIT license stays with the source
in `vendor/premiere-pro-mcp/`. Our editorial skills are separate original work.

Installed locally:
- Built server: `vendor/premiere-pro-mcp/dist/index.js`.
- CEP panel: `~/Library/Application Support/Adobe/CEP/extensions/MCPBridgeCEP`.
- Codex server entry: `premiere_pro`, pointing at the absolute local Node/server paths.
- Bridge folder: `/tmp/premiere-mcp-bridge`.
- Server telemetry and update checks disabled for this registration.
- Adobe CEP `PlayerDebugMode=1` for CSXS 10, 11, 12, explicitly approved by the user.

Open Premiere and an editing project, then Window → Extensions → MCP Bridge (CEP). The panel may auto-start;
otherwise save the bridge path and press Start Bridge / Test Connection. Restart
Codex to load the new server. Verify connection before editing. The panel has a
separate anonymous-usage checkbox; disable it there if desired.

If the panel is absent, the supplied project's troubleshooting recommends enabling
Premiere Preferences → Plugins → UXP developer mode and restarting Premiere. This
setting has not been changed by our setup. The supported bridge is CEP; the bundled
UXP bridge remains experimental according to the supplied version's documentation.

`node premiere/check.mjs` checks readiness without launching the app. The latest check returned `success: true`, `status: connected`, and `bridge: responsive`
in Premiere 26.5.2 (build 5), with the setup project and active sequence read back. Pass `--launch` to allow the supported bridge to start Premiere when needed. No real editing/export operation has been verified yet.

Use catalog search and current tool schemas after connection. Tools may use different
time units; inspect the actual schema. Existing caption text can be inaccessible in
Premiere scripting, and Media Encoder queue status may be incomplete. Validate the
real timeline and output files rather than treating a successful call as completion.

Reinstallation uses `bash premiere/install.sh`; it backs up an existing panel
before copying and updates only the named Codex entry. It does not alter Claude config.
The required Adobe debug setting permits unsigned CEP extensions. Do not run this
installer on another machine without the owner's approval of that setting.

If uninstalling, remove the named MCP entry with `codex mcp remove premiere_pro` and
remove only the MCPBridgeCEP folder. Turn off the Adobe debug setting only if no other
needed unsigned extensions rely on it; setup did not record the previous debug values.

Menu automation is possible through macOS Accessibility when granted. The user has
enabled access for this setup. If Extensions is disabled, establish that Premiere
is fully loaded with a usable editing workspace before changing further settings.
Normal menu Quit worked during setup; AppleEvent quit timed out. Do not force quit
or discard work to connect the bridge.

## Verified Home-screen fix

On 2026-10-09, Extensions was disabled while Premiere was on Home. A copy of Adobe’s
media-free Standard Template Project was opened through File → Open Project from
`premiere/bridge-setup/Bridge Setup.prproj`. Premiere created/opened `Bridge Setup_1.prproj`.
The Extensions submenu then became enabled and listed MCP Bridge (CEP). Opening it
auto-started the bridge; the canonical connection check succeeded. No extra UXP
developer setting was needed. Existing user edits were not used.

For macOS menu automation, inspect dialogs in a separate call after triggering them;
immediate window enumeration can return empty while a native dialog is still opening.
The Home/Adobe workspace may expose menus but not its main window through Accessibility.
The standard Open Project dialog did expose its path sheet and Open button.


## Layered editing verified
On 2026-10-10, a user-authorized force restart and fresh template copy restored the
bridge. Imported legacy FCP7 XML containing ProRes 4444 alpha layers and separate
audio clips, created native captions from SRT, exported verification frames, and
saved Vector DB Layered Edit v01.prproj. Keep MCP Bridge (CEP) panel open during
calls. Force close is only appropriate with explicit authorization to discard the
current session. Native caption appearance defaults to Premiere styling; the
bridge does not expose a caption styling API.


## Export detection limitation
The installed bridge's macOS Media Encoder check only searched top-level .app names
in /Applications. Adobe's installed app was nested inside its versioned folder, so
MEDIA_ENCODER_NOT_INSTALLED was a detection failure, not proof of absence. Inspect
the real installation before recommending installation. No application alias was
created: automatic approval review rejected the system-directory change. Do not
repeat that workaround without explicit permission. The user subsequently cancelled
export. Project saving and layered assembly were verified independently of export.
