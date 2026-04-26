/*
  Helper function to define an aircraft data structure:
  {
    information: {
      name: 'My Aircraft',
      version: '1.0.0',
      creator: 'me',
    },
    wings: [
      {
        name: 'Wing1',
        transform: {
          rotation: { x: 0, y: 0, z: 0, },
          scaling: { x: 1, y: 1, z: 1, },
          translation: { x: 0, y: 0, z: 0, },
        },
        elements: [
          { airfoilUid: 'NACA0009',
            transform: { ...  }
          },
          { airfoilUid: 'NACA0009',
            transform: { ...  }
          },
        ]
      }
    ],
  }
*/

// Initialize an aircraft
export function init() {
  return {
    information: { name: '', version: '1.0.0', creator: '', },
    wings: [],
  };
}

export function pushWingElement(aircraft, wingIndex) {
  const wings = aircraft.wings[wingIndex];
  const airfoilUid = wings.elements.length > 0 ? wings.elements[wings.elements.length-1].airfoilUid : 'NACA0009';
  wings.elements.push({
    airfoilUid,
    transform: makeTransform(),
  });
  return aircraft;
}

export function deleteWingElement(aircraft, wingIndex, elementIndex) {
  aircraft.wings[wingIndex].elements.splice(elementIndex, 1);
  return aircraft;
}

export function pushWing(aircraft) {
  aircraft.wings.push({
    name: `wing${aircraft.wings.length}`,
    transform: makeTransform(),
    elements: [],
  });
  return aircraft;
}

export function deleteWing(aircraft, i) {
  aircraft.wings.splice(i, 1);
  return aircraft;
}

function makeTransform() {
  return {
    rotation: { x: 0, y: 0, z: 0, },
    scaling: { x: 1, y: 1, z: 1, },
    translation: { x: 0, y: 0, z: 0, },
  };
}
