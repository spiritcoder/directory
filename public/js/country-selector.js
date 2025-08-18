// Country selector functionality
document.addEventListener('DOMContentLoaded', function() {
  const countryDropdown = document.querySelector('.country-dropdown');
  
  if (countryDropdown) {
    countryDropdown.addEventListener('change', function() {
      const selectedCountry = this.value;
      window.location.href = `/${selectedCountry}`;
    });
  }
});