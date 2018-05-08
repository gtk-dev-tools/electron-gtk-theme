import parseColor from 'color-parser';
import convert from 'color-convert';
import addCSSFunction from './add-css-function';

let  colorTransformers, currentNode, debug, fn, fnName, lerp, parse, rgba;

debug = function() {
  console.log(...arguments)
}; // console.log arguments...

currentNode = null;

parse = function(value) {
  var e, ref;
  try {
    return (function() {
      if (value === 'currentColor') {
        value = 'rgba(0, 0, 0, 0)';
      }
      if ((ref = parseColor(value)) != null) {
        return ref;
      } else {
        return ref;
      }
    })();
  } catch (error) {
    e = error;
    if (currentNode) {
      console.error(e.stack);
      throw currentNode.error(e.message);
    } else {
      console.error('Error parsing color (with no associated CSS node)');
      throw e;
    }
  }
};

lerp = function(a, b, x) {
  return a + (b - a) * x;
};

rgba = function(r, g, b, a) {
  if (isNaN(a) || a === 1) {
    return `rgb(${~~r}, ${~~g}, ${~~b})`;
  } else {
    return `rgba(${~~r}, ${~~g}, ${~~b}, ${a})`;
  }
};

colorTransformers = {
  mix: function(colorA, colorB, x) {
    var a, b, l;
    debug(`MIX COLORS ${colorA} AND ${colorB} BY LERPY AMOUNT ${x}`);
    a = parse(colorA);
    b = parse(colorB);
    debug('-', colorA, a);
    debug('-', colorB, b);
    debug('-', x);
    l = (p) => {
      return lerp(a[p], b[p], x);
    };
    return rgba(l('r'), l('g'), l('b'), l('a'));
  },
  shade: function(color, value) {
    var a, b, g, h, l, r, s;
    if (isNaN(value)) {
      [color, value] = [value, color];
    }
    debug(`SHADE COLOR ${color} BY VALUE ${value}`);
    ({r, g, b, a} = parse(color));
    [h, s, l] = convert.rgb.hsl(r, g, b);
    debug(`- OLD LIGHTNESS: ${l}`);
    l *= value; // @FIXME
    debug(`- NEW LIGHTNESS: ${l} (AFTER APPLYING ${value})`);
    [r, g, b] = convert.hsl.rgb(h, s, l);
    return rgba(r, g, b, a);
  },
  alpha: function(color, factor) {
    var a, b, g, r;
    if (isNaN(factor)) {
      [color, factor] = [factor, color];
    }
    debug(`MULTIPLY ALPHA OF COLOR ${color} BY FACTOR ${factor}`);
    ({r, g, b, a} = parse(color));
    debug('- OLD', rgba(r, g, b, a));
    a *= factor;
    debug('- NEW', rgba(r, g, b, a));

    // @TODO: handle %
    return rgba(r, g, b, a);
  }
};

const out = function() {
  for (fnName in colorTransformers) {
    fn = colorTransformers[fnName];
    addCSSFunction(fnName, fn);
  }
}

export default out;
