# electron-gtk-theme

This module inspects the system GTK theme, icon theme, and builds browser-compatible CSS. It is based on [postcss-gtk](https://github.com/1j01/postcss-gtk) and [@jakejarrett/gtk-theme](https://github.com/jakejarrett/node-gtk-theme). This is alpha-quality software and a work-in-progress.

### Options

  - `outputPath` (string): The directory that the generated CSS, and the fallback CSS resides in.

### Fallback

If a theme is in a `resource://` path, electron-gtk-theme will fallback to a file named `gtk.css` in a directory configured by `outputPath`.
