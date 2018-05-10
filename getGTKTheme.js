import fs from 'fs';
import {join} from 'path';
import {homedir} from 'os';
import {execSync} from 'child_process';
import postgtk from './postcss-gtk/postcss-gtk';
import desktopEnv from 'desktop-env';
import {filter, walk} from './utils';

const getFolder = function(dir) {
  try {
    console.log('dir', dir);
    fs.statSync(dir);
    return dir;
  } catch (e) {
    return null
  }
};

const getIconTheme = function(environment) {
  return new Promise(function(resolve, reject) {
    let schema;
    if (environment === 'Cinnamon') {
      schema = 'org.cinnamon.desktop.interface icon-theme';
    } else {
      schema = 'org.gnome.desktop.interface icon-theme';
    }
    let iconTheme = execSync(`gsettings get ${schema}`, {encoding: 'utf8'})
      .split(`'`)
      .join('')
      .replace(/\n$/, '');
    walk(`/usr/share/icons/${iconTheme.trim()}`, (err, items) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(
        filter(items, function(item) {
          return item.substr(-4) === '.png';
        })
      );
    });
  });
}

const getTheme = function() {
  return desktopEnv().then(environment => {
    let schema;
    if (environment === 'Cinnamon') {
      schema = 'org.cinnamon.desktop.interface gtk-theme';
    } else {
      schema = 'org.gnome.desktop.interface gtk-theme';
    }
    let gtkTheme = execSync(`gsettings get ${schema}`, {encoding: 'utf8'});
    return {environment, gtkTheme};
  }).then(function({environment, gtkTheme}) {
    const themeName = gtkTheme
      .split(`'`)
      .join('')
      .replace(/\n$/, '');
    const decorationLayout = execSync('gsettings get org.gnome.desktop.wm.preferences button-layout', {encoding: 'utf8'}).split(`'`)
      .join('')
      .replace(/\n$/, '');
    const arrayOfButtons = decorationLayout.split(':');
    const supportedButtons = arrayOfButtons.filter(button => button !== 'appmenu')[0].split(',');

    const globalTheme = getFolder(`/usr/share/themes/${themeName}`);
    const userTheme = getFolder(`${homedir()}/.themes/${themeName}`);
    console.log(globalTheme)
    let theme = null;
    let dir = 'gtk-3.0';
    let fileName = 'gtk';
    let buttonLayout = 'right';

    if (userTheme) {
      theme = userTheme;
    }

    if (globalTheme) {
      theme = globalTheme;
    }


    if (decorationLayout.indexOf('menu') !== -1 && arrayOfButtons[arrayOfButtons.length - 1] === 'appmenu') {
      buttonLayout = 'left';
    }

    const getCSS = function(path, r = 0) {
      let cssString;
      try {
        cssString = fs.readFileSync(path, {encoding: 'utf8'});
      } catch (e) {
        cssString = fs.readFileSync(path.replace(/3\.0/g, '3.20'), {encoding: 'utf8'});
        //throw new Error(`Unable to read file: ${path}`, e);
      }
      if (cssString.indexOf('resource://') > -1 || cssString.indexOf('Adwaita') > -1) {
        return getCSS(join(__dirname, 'gtk.css'), r);
      }
      let overrides = [
        [/[^:]hover/g, 'a:hover'],
        [/\.button/g, 'button'],
        [/button\:link/g, 'a'],
        [/button\:visited/g, 'a:visited'],
        [/button {/g, 'button, .checkbox {'],
        [/button\:checked/g, 'input:checked'],
        [/[^\.|\-|@]radio/g, ' input[type=radio]'],
        [/([^\-|@])\bcheck\b/g, '$1input[type=checkbox]'],
        [/checkbutton/g, '.checkbutton'],
        [/modelbutton/g, '.modelbutton'],
        [/toolbutton/g, '.toolbutton'],
        [/contents/g, '.contents'],
        [/notebook/g, '.notebook'],
        [/([^\-|@])\bbox\b([^\-|@])/g, '$1.box'],
        [/\bentry\b/g, 'input'],
        [/[^\.|@]progress/, '.progress'],
        [/[^\.|@]\bprogressbar\b/g, '.progressbar'],
        [/[^\.\-|@]\btrough\b/g, '.trough'],
        [/[^\.\-|@]scalescale/g, '.scale'],
        [/[^\.|\-|\w|@]list/g, '.list'],
        [/[^\.|\-|\w|@]row/g, '.row'],
        [/[^\.|\-|\w|@]paned/g, '.paned'],
        [/[^\.|\-|\w|@]tooltip/g, '.tooltip'],
        [/[^\.|\-|\w|@]colorchooser/g, '.colorchooser'],
        [/[^\.|\-|\w|@]colorswatch/g, '.colorswatch'],
        [/[^\.|\-|\w|@]decoration/g, '.decoration'],
        [/[^\.|\-|\w|@]filechooser/g, '.filechooser'],
        [/[^\.|\-|\w|@]placessidebar/g, '.placessidebar'],
        [/[^\.|\-|\w|@]layouttab/g, '.layouttab'],
        [/([^\.|\-|\w|@])\blayout\b/g, '$1.placessidebar'],
        [/([^\.|\-|\w|@])\bstack\b/g, '$1.stack'],
        [/\:selected/g, '.selected'],
        [/\-gtk\-icon\-transform\:/g, 'transform:'],
        [/icon\-shadow\:/g, 'box-shadow:'],
        [/[^\.|@]menu/g, '.menu'],
        [/headerbar/g, '.headerbar'],
        [/infobar/g, '.infobar'],
        [/(?=\s)decoration/g, '.decoration'],
        [/workbench/g, '.workbench'],
        [/searchbar/g, '.searchbar'],
        [/actionbar/g, '.actionbar'],
        [/treeview/g, '.treeview'],
        [/pillbox/g, '.pillbox'],
        [/docktabstrip/g, '.docktabstrip'],
        [/docktab/g, '.docktab'],
        [/dockbin/g, '.dockbin'],
        [/dockpaned/g, '.dockpaned'],
        [/dockoverlayedge/g, '.dockoverlayedge'],
        [/[^\-\.|@]toolbar/g, '.toolbar'],
        [/[^\-\.|@]omnibar/g, '.omnibar'],
        [/combobox/g, '.combobox'],
        [/spinbutton/g, '.spinbutton'],
        [/[^\w|\.]spinner/g, '.spinner'],
        [/popover/g, '.popover'],
        [/assistant/g, '.assistant'],
        [/flowbox/g, '.flowbox'],
        [/flowboxchild/g, '.flowboxchild'],
        [/iconview/g, '.iconview'],
        [/textview/g, 'textarea'],
        [/rubberband/g, '.rubberband'],
        [/selection/g, '.selection'],
        [/[^\.|@]header\s/g, '.header'],
        [/\-gtk\-outline\-radius/g, 'outline-width'],
        [/[^\-|@]separator/g, '.separator'],
        [/[^\-|@]window/g, 'body'],
        [/\.background/g, 'body'],
        [/([^\.\-@#\d])\b([A-Z]\w+)\b/g, '.$2'],
        [/\.\./g, '.'],
        [/(\w+\:\w+)(\:\w+)(\:)/g, '$1$3'],
        [/\w+\:\s[\d]+[\n]/g, '$&;'],
        [/(@import url\(")([\w|\-|\.|\/]+)("\))/g, `$1${theme}/${dir}/$2$3`],
        [/[^\-\.|@]scrollbar/g, '*::-webkit-scrollbar'],
        [/\*::-webkit-scrollbar slider/g, '*::-webkit-scrollbar-thumb']
      ];

      for (let i = 0; i < overrides.length; i++) {
        cssString = cssString.replace(...overrides[i]);
      }

      let imports = cssString.match(/(@import url\(")([\w|\-|\.|\/]+)("\))/g);
      if (imports) {
        for (let i = 0; i < imports.length; i++) {
          let cssPath = /(@import url\(")([\w|\-|\.|\/]+)("\))/g.exec(imports[i])[2];
          cssString += getCSS(cssPath, r + 1);
        }
      }

      if (r === 0) {
        cssString += '* {outline: none !important; user-select: none !important;} a {cursor: pointer;}';
      }

      return cssString;
    };

    let css = getCSS(`${theme}/${dir}/${fileName}.css`);
    css = css.replace(/@define-color(\s[a-zA-Z_\s#\d\:;\(,\.\)]+)/g, '')
    fs.writeFileSync('/home/jason/code/next/app/test.css', css);

    let out = {};

    return postgtk.process(css).then(result => {
      out = {
        environment,
        themeName,
        decorationLayout,
        buttonLayout,
        supportedButtons,
        root: theme || {},
        dir: `${theme}/${dir}/`,
        raw: result.css
      };
      return getIconTheme(environment);
    }).then((iconPaths) => {
      out.iconPaths = iconPaths;
      return out;
    });
  });
};

export default getTheme;
