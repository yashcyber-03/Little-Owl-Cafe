'use strict';
const crypto = require('crypto');
const m = (cat, name, desc, tag = '') => ({ id: crypto.randomBytes(4).toString('hex'), cat, name, desc, tag });
module.exports = [
  m('Coffee', 'Cappuccino', 'Espresso with silky steamed milk and foam.', 'Popular'),
  m('Coffee', 'Spanish Latte', 'Sweet, creamy and smooth.'),
  m('Coffee', 'Tonic Cold Brew', 'Cold brew over tonic, crisp and refreshing.'),
  m('Coffee', 'Cranberry Cold Brew', 'Cold brew with a tart cranberry lift.'),
  m('Cold drinks', 'Salted Caramel Frappe', 'Blended, creamy and just salty enough.'),
  m('Cold drinks', 'Chocolate Shake', 'Thick and chocolatey.'),
  m('Starters & snacks', 'Peri-Peri Fries', 'Crisp fries with a peri-peri kick.', 'Popular'),
  m('Starters & snacks', 'Hummus Platter', 'Hummus served with sides for sharing.'),
  m('Starters & snacks', 'Mushroom Crostini', 'Toasted bread topped with mushrooms.'),
  m('Starters & snacks', 'Garlic Bread', 'Warm, buttery and garlicky.'),
  m('Starters & snacks', 'Paneer Tikka Wrap', 'Spiced paneer in a wrap.'),
  m('Pizza & mains', 'Four Cheese Pizza', 'Thin crust, four cheeses.'),
  m('Pizza & mains', 'Paneer Tikka Pizza', 'Paneer tikka with a balanced topping.'),
  m('Pizza & mains', 'Pesto Pasta', 'Pasta in a fresh basil pesto.', 'Popular'),
  m('Pizza & mains', 'Chicken Parmigiana', 'Crumbed chicken baked with cheese and sauce.'),
  m('Pizza & mains', 'Fish and Chips', 'Crisp battered fish with fries.')
];
