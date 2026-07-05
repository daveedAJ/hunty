module.exports = {
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
  digestStringAsync: jest.fn(() => Promise.resolve('hash')),
};
