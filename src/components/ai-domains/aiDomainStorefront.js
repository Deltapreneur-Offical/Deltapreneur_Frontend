export function prepareAIDomainStorefront(domain) {
  return {
    type: 'future_storefront',
    domain,
    run() {
      console.log('Future CoBrother Storefront', { domain });
    },
  };
}
