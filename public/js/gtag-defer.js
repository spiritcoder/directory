window.addEventListener("load", function () {
  setTimeout(function () {
    // Dynamically create the script element
    var script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-C9Q6K2GRCK";
    script.async = true;
    script.defer = true;

    // Append the script to the document
    document.head.appendChild(script);

    script.onload = function () {
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      window.gtag = gtag; // Make gtag accessible globally

      gtag("js", new Date());
      gtag("config", "G-C9Q6K2GRCK");
    };
  }, 3000);
});