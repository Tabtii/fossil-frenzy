jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Reanimated, worklets and gesture handler have no native modules under Jest.
jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));
jest.mock('react-native-gesture-handler/lib/commonjs/RNGestureHandlerModule', () =>
  jest.requireActual('react-native-gesture-handler/lib/commonjs/mocks/mocks')
);
jest.mock('react-native-gesture-handler/src/RNGestureHandlerModule', () =>
  jest.requireActual('react-native-gesture-handler/src/mocks/mocks')
);
