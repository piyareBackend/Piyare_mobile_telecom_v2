(function(){
  const business={
    "@context":"https://schema.org",
    "@type":"MobilePhoneStore",
    "name":"Piyare Mobile Telecom",
    "url":"https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/",
    "sameAs":["https://www.justdial.com/Katihar/Piyare-Mobile-Telecom-Dwashay/9999P6452-6452-250401125010-W1X1_BZDET"],
    "address":{"@type":"PostalAddress","streetAddress":"Dwashay","addressLocality":"Katihar","addressRegion":"Bihar","postalCode":"855114","addressCountry":"IN"},
    "areaServed":"Katihar, Bihar",
    "description":"Piyare Mobile Telecom provides mobile phone repair, accessories and related mobile services in Katihar, Bihar.",
    "knowsAbout":["mobile phone repair","screen repair","battery replacement","charging port repair","mobile accessories","phone accessories"]
  };
  const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify(business);document.head.appendChild(s);
})();