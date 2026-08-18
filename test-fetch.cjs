fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products')
  .then(res => res.text())
  .then(text => {
    console.log('Fetch length:', text.length);
    console.log('Ends with:', text.substring(text.length - 100));
    try {
      JSON.parse(text);
      console.log('JSON Parses successfully!');
    } catch(e) {
      console.error('JSON Parse error:', e.message);
    }
  });
