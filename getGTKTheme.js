import fs from 'fs';
import {join} from 'path';
import {homedir} from 'os';
import {execSync} from 'child_process';
import postgtk from './postcss-gtk/postcss-gtk';
import desktopEnv from 'desktop-env';
import {uniq} from 'lodash';
import {filter, each, walk} from './utils';

const getFolder = function(dir) {
  try {
    console.log('dir', dir);
    fs.statSync(dir);
    return dir;
  } catch (e) {
    return null;
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
    if (iconTheme.indexOf('Mint-X') > -1) {
      iconTheme = 'Mint-X';
    }
    let themePaths = [];
    let otherPaths = [];
    walk(`/usr/share/icons/`, (err, items) => {
      if (err) {
        reject(err);
        return;
      }
      each(items, function(item) {
        if (item.indexOf('16') === -1) {
          return;
        }
        if (item.indexOf(iconTheme) > -1) {
          themePaths.push(item);
        } else {
          otherPaths.push(item);
        }
      });
      resolve(
        filter(uniq(themePaths.concat(otherPaths)), function(item) {
          return item.substr(-4) === '.png';
        })
      );
    });
  });
}

const getTheme = function(config) {
  const {outputPath} = config;
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
      } catch (e) { // TODO: Make GTK version configurable
        cssString = fs.readFileSync(path.replace(/3\.0/g, '3.20'), {encoding: 'utf8'});
      }
      if (cssString.indexOf('resource://') > -1 || cssString.indexOf('Adwaita') > -1) {
        return getCSS(join(outputPath, './gtk.css'), r);
      }
      let overrides = [
        [/[^:]hover/g, 'a:hover'],
        [/\.button/g, 'button'],
        [/button\:link/g, 'a'],
        [/button\:visited/g, 'a:visited'],
        [/button {/g, 'button, .checkbox {'],
        [/button\:checked/g, 'input:checked'],
        [/[^\.|\-|@]radio/g, ' input[type=radio]'],
        [/(?!\/)([^\-|@])\bcheck\b/g, '$1input[type=checkbox]'],
        [/([^\.|\-|\w|@])\bcheckbutton\b/g, '$1.checkbutton'],
        [/([^\.|\-|\w|@])\bmodelbutton\b/g, '$1.modelbutton'],
        [/([^\.|\-|\w|@])\btoolbutton\b/g, '$1.toolbutton'],
        [/([^\.|\-|\w|@])\bcontents\b/g, '$1.contents'],
        [/([^\.|\-|\w|@])\bnotebook\b/g, '$1.notebook'],
        [/([^\-|@])\bbox\b([^\-|@])/g, '$1.box'],
        [/\bentry\b/g, 'input'],
        [/[^\.|@]progress/, '.progress'],
        [/([^\.|\-|\w|@])\bprogressbar\b(?!\-)/g, '.progressbar'],
        [/[^\.\-|@]\btrough\b/g, '.trough'],
        [/[^\.\-|@]scalescale/g, '.scale'],
        [/([^\.|\-|\w|@])\blist\b/g, '$1.list'],
        [/([^\.|\-|\w|@])\brow\b/g, '$1.row'],
        [/([^\.|\-|\w|@])\bpaned\b/g, '$1.paned'],
        [/([^\.|\-|\w|@])\btooltip\b/g, '$1.tooltip'],
        [/([^\.|\-|\w|@])\bcolorchooser\b/g, '$1.colorchooser'],
        [/([^\.|\-|\w|@])\bcolorswatch\b/g, '$1.colorswatch'],
        [/([^\.|\-|\w|@])\boverlay\b/g, '$1.overlay'],
        [/([^\.|\-|\w|@])\bshortcuts-section\b/g, '$1.shortcuts-section'],
        [/([^\.|\-|\w|@])\bcursor-handle\b/g, '$1.cursor-handle'],
        [/([^\.|\-|\w|@])\bdecoration\b/g, '$1.decoration'],
        [/([^\.|\-|\w|@])\bfilechooser\b/g, '$1.filechooser'],
        [/([^\.|\-|\w|@])\bplacessidebar\b/g, '$1.placessidebar'],
        [/([^\.|\-|\w|@])\blayouttab\b/g, '$1.layouttab'],
        [/([^\.|\-|\w|@])\blayout\b/g, '$1.placessidebar'],
        [/([^\.|\-|\w|@])\bstack\b/g, '$1.stack'],
        [/([^\.|\-|\w|@])\bscale\b(?!\()/g, '$1.scale'],
        [/([^\.|\-|\w|@])\bhighlight\b(?!;)/g, '$1.highlight'],
        [/([^\.|\-|\w|@])\bfill\b/g, '$1.fill'],
        [/([^\.|\-|\w|@])\blevelbar\b/g, '$1.levelbar'],
        [/([^\.|\-|\w|@])\bblock\b/g, '$1.block'],
        [/([^\.|\-|\w|@])\bscrollebody\b/g, '$1.scrollebody'],
        [/([^\.|\-|\w|@])\bviewport\b/g, '$1.viewport'],
        [/([^\.|\-|\w|@])\bovershoot\b/g, '$1.overshoot'],
        [/([^\.|\-|\w|@])\bexpander\b/g, '$1.expander'],
        [/([^\.|\-|\w|@])\barrow\b/g, '$1.arrow'],
        [/([^\.|\-|\w|@])\bcalendarbutton\b/g, '$1.calendarbutton'],
        [/([^\.|\-|\w|@])\bstacksidebar\b/g, '$1.stacksidebar'],
        [/([^\.|\-|\w|@])\bstackswitcher\b/g, '$1.stackswitcher'],
        [/([^\.|\-|\w|@])\bplacesview\b/g, '$1.placesview'],
        [/([^\.|\-|\w|@])\beditortweak\b/g, '$1.editortweak'],
        [/([^\.|\-|\w|@])\begg\b/g, '$1.egg'],
        [/([^\.|\-|\w|@])\bpreferences\b/g, '$1.preferences'],
        [/([^\.|\-|\w|@])\bdevhelppanel\b/g, '$1.devhelppanel'],
        [/([^\.|\-|\w|@])\bsymboltreepanel\b/g, '$1.symboltreepanel'],
        [/([^\.|\-|\w|@])\bconfigurationview\b/g, '$1.configurationview'],
        [/([^\.|\-|\w|@])\bmessagedialog\b/g, '$1.messagedialog'],
        [/([^\.|\-|\w|@])\bheaderbutton\b/g, '$1.headerbutton'],
        [/\:selected/g, '.selected'],
        [/\-gtk\-icon\-transform\:/g, 'transform:'],
        [/\-gtk\-outline\-bottom\-right\-radius\:/g, 'border-bottom-right-radius:'],
        [/\-gtk\-outline\-bottom\-left\-radius\:/g, 'border-bottom-left-radius:'],
        [/icon\-shadow\:/g, 'text-shadow:'],
        [/([^\.|\-|\w|@])\bmenuitem\b/g, '$1.menuitem'],
        [/([^\.|\-|\w|@])\bmenuitembutton\b/g, '$1.menuitembutton'],
        [/([^\.|\-|\w|@])\baccelerator\b/g, '$1.accelerator'],
        [/([^\.|\-|\w|@])\bheaderbar\b/g, '$1.headerbar'],
        [/([^\.|\-|\w|@])\binfobar\b/g, '$1.infobar'],
        [/(?=\s)decoration/g, '.decoration'],
        [/([^\.|\-|\w|@])\bworkbench\b/g, '$1.workbench'],
        [/([^\.|\-|\w|@])\bsearchbar\b/g, '$1.searchbar'],
        [/([^\.|\-|\w|@])\bactionbar\b/g, '$1.actionbar'],
        [/([^\.|\-|\w|@])\btreeview\b/g, '$1.treeview'],
        [/([^\.|\-|\w|@])\bpillbox\b/g, '$1.pillbox'],
        [/([^\.|\-|\w|@])\bdocktabstrip\b/g, '$1.docktabstrip'],
        [/([^\.|\-|\w|@])\bdocktab\b/g, '$1.docktab'],
        [/([^\.|\-|\w|@])\bdockbin\b/g, '$1.dockbin'],
        [/([^\.|\-|\w|@])\bdockpaned\b/g, '$1.dockpaned'],
        [/([^\.|\-|\w|@])\bdockoverlayedge\b/g, '$1.dockoverlayedge'],
        [/[^\-\.|@]toolbar/g, '.toolbar'],
        [/[^\-\.|@]omnibar/g, '.omnibar'],
        [/combobox/g, '.combobox'],
        [/spinbutton/g, '.spinbutton'],
        [/([^\.|\-|\w|@])\bspinner\b(?!\s\d)/g, '$1.spinner'],
        [/popover/g, '.popover'],
        [/assistant/g, '.assistant'],
        [/flowbox/g, '.flowbox'],
        [/flowboxchild/g, '.flowboxchild'],
        [/([^\.|\-|\w|@])\biconview\b/g, '$1.iconview'],
        [/textview/g, 'textarea'],
        [/rubberband/g, '.rubberband'],
        [/selection/g, '.selection'],
        [/([^\.|\-|\w|@])\bheader\b/g, '$1.header'],
        [/\-gtk\-outline\-radius/g, 'outline-width'],
        [/[^\-|@]separator/g, '.separator'],
        [/([^\.|\-|\w|@])\bwindow\b/g, '$1body'],
        [/\.background/g, 'body'],
        [/([^\.\-@#\d])\b([A-Z]\w+)\b(?!;)/g, '.$2'],
        [/\.\./g, '.'],
        [/(\w+\:\w+)(\:\w+)(\:)/g, '$1$3'],
        [/\w+\:\s[\d]+[\n]/g, '$&;'],
        [/(@import url\(")([\w|\-|\.|\/]+)("\))/g, `$1${theme}/${dir}/$2$3`],
        [/[^\-\.|@]scrollbar/g, '*::-webkit-scrollbar,*::-webkit-scrollbar-corner'],
        [/\*::-webkit-scrollbar-corner slider/g, '*::-webkit-scrollbar-thumb'],
        [/([^\.|\-|\w|@])\bbodybody\b/g, '$1body'],
        [/([^\.|\-|\w|@])\bswitch(?!\-)\b/g, '$1.switch'],
        [/([^\.|\-|\w|@])\bslider\b/g, '$1.slider'],
        [/([^\.|\-|\w|@])\bundershoot\b/g, '$1.undershoot'],
        [/\-gtk\-box\-shadow\:/g, 'box-shadow:'],
        [/\-gtk\-text\-shadow\:/g, 'text-shadow:'],
        [/\-gtk\-icon\-filter\:\s+[a-z]+/g, 'filter: blur'],
        [/\-gtk\-secondary\-caret\-color\:/g, 'caret-color:'],
        [/\-gtk\-icon\-size\:/g, 'font-size:'],
        [/\-gtk\-scaled\(/g, ''],
        [/\-gtk\-recolor\(/g, ''],
        [/\.png"\)\)/g, '.png")'],
        [/(url\(\")(assets)/g, `$1${theme}/${dir}/$2`]
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

    css = css.replace(/@define-color(\s[a-zA-Z_\s#\d\:;\(,\.\)]+)/g, '');

    if (process.env.NODE_ENV === 'development') {
      fs.writeFileSync(join(outputPath, 'gtk-generated.css'), css);
    }

    let out = {
      environment,
      themeName,
      decorationLayout,
      buttonLayout,
      supportedButtons,
      root: theme || {},
      dir: `${theme}/${dir}/`,
    };

    return postgtk.process(css).then((result) => {
      out.raw = result.css;
      return getIconTheme(environment);
    }).then((iconPaths) => {
      out.iconPaths = iconPaths;
      return out;
    }).catch((err) => {
      throw err;
    })
  });
};

export default getTheme;
