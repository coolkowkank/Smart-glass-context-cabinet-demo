// EDITABLE: what the glasses look at, and where cards and markers pin in it.
//
// Anchors are fractions of the PHOTO (0,0 = top-left of the image). They are
// projected through the same object-fit: cover crop the browser applies, so a
// card stays on the right object at any screen size. To use another photo,
// replace the file, update width/height, and move the anchors.
import restaurantUrl from '../assets/restaurant.jpg'
import streetUrl from '../assets/street.jpg'

export const SCENES = {
  street: {
    id: 'street',
    src: import.meta.env.VITE_BACKGROUND_URL || streetUrl,
    width: 750,
    height: 600,
    focus: { x: 0.55, y: 0.5 }, // which part of the photo stays in view when cropped
    // Chosen so every anchor stays on screen from phone portrait to 16:9.
    anchors: {
      building: { x: 0.53, y: 0.36 }, // upper floors of the apartment block
      sky: { x: 0.5, y: 0.2 },        // roofline / sky above it
      skyLeft: { x: 0.45, y: 0.26 },  // where new notes pin
      cafe: { x: 0.6, y: 0.71 },      // top of the ground-floor shopfront
    },
    // Where the M7 scan labels pop up, by signal kind.
    signals: {
      income: { x: 0.5, y: 0.25, delay: 400 },
      savings: { x: 0.55, y: 0.46, delay: 850 },
      spending: { x: 0.6, y: 0.71, delay: 1300 },
    },
  },

  // Lunch at Field & Fork: the glasses read the menu on the table.
  restaurant: {
    id: 'restaurant',
    src: restaurantUrl,
    width: 1536,
    height: 1024,
    focus: { x: 0.52, y: 0.5 },
    anchors: {
      // Bare wood left of the menu holds the budget card. On narrow screens that's
      // cropped away, so it pins to the top edge of the menu instead.
      table: { x: 0.11, y: 0.4, narrow: { x: 0.52, y: 0.14 } },
      menu: { x: 0.52, y: 0.2 },
    },
    // One marker per menu item, just right of its printed price.
    marks: {
      'local-greens': { x: 0.3685, y: 0.3623 },
      'kale-caesar': { x: 0.3652, y: 0.3877 },
      'quinoa-veg': { x: 0.3633, y: 0.4121 },
      'sandwich-1': { x: 0.3568, y: 0.4844 },
      'sandwich-2': { x: 0.3542, y: 0.5127 },
      'sandwich-3': { x: 0.3522, y: 0.543 },
      'sweet-potato-fries': { x: 0.332, y: 0.6367 },
      'herb-slaw': { x: 0.3301, y: 0.6621 },
      'seasonal-pickles': { x: 0.3288, y: 0.6855 },
      'homestead-burger': { x: 0.5534, y: 0.2969 },
      'harvest-bowl': { x: 0.5501, y: 0.4355 },
      'lemon-cake': { x: 0.5436, y: 0.584 },
      'casarecce-pasta': { x: 0.5443, y: 0.7344 },
      'house-lemonade': { x: 0.7952, y: 0.2832 },
      'iced-tea': { x: 0.7965, y: 0.3047 },
      'arnold-palmer': { x: 0.7978, y: 0.3262 },
      'sparkling-water': { x: 0.7991, y: 0.3477 },
      'mexican-coke': { x: 0.8011, y: 0.3701 },
      'local-kombucha': { x: 0.8024, y: 0.3926 },
      'drip-coffee': { x: 0.8076, y: 0.4561 },
      'iced-coffee': { x: 0.8082, y: 0.4785 },
      cappuccino: { x: 0.8089, y: 0.502 },
      latte: { x: 0.8102, y: 0.5254 },
      espresso: { x: 0.8108, y: 0.5488 },
      'almond-milk': { x: 0.8141, y: 0.6143 },
      'extra-shot': { x: 0.8141, y: 0.6396 },
      'vanilla-caramel': { x: 0.8147, y: 0.665 },
    },
  },
}

// Kept for code that only knows the street.
export const SCENE = SCENES.street

// Screen position (px) of a point given in photo fractions.
export function projectPoint(p, vp, scene = SCENE) {
  const s = Math.max(vp.W / scene.width, vp.H / scene.height)
  const ox = (vp.W - scene.width * s) * scene.focus.x
  const oy = (vp.H - scene.height * s) * scene.focus.y
  return { x: ox + p.x * scene.width * s, y: oy + p.y * scene.height * s }
}

export const project = (anchorName, vp, scene = SCENE) => {
  const a = scene.anchors[anchorName] || Object.values(scene.anchors)[0]
  return projectPoint(vp.W < 640 && a.narrow ? a.narrow : a, vp, scene)
}
