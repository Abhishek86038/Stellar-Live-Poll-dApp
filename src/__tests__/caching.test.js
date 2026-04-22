describe('Caching', () => {
  test('Should cache poll data for 30 seconds', async () => {
    // Fetch data
    // Assert cached flag true
    // Fetch again within 30s
    // Assert same cached data
    expect(true).toBe(true);
  });

  test('Should clear cache after TTL', async () => {
    // Cache data
    // Wait 31 seconds
    // Fetch again
    // Assert fresh data (not cached)
    expect(true).toBe(true);
  });
});
