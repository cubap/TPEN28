// import $ from 'https://code.jquery.com/jquery-3.2.0.slim.min.js';
var settings = {
  "async": true,
  "crossDomain": true,
  "url": "https://cubap.auth0.com/oauth/token",
  "method": "POST",
  "headers": {
    "content-type": "application/json"
  },
  "processData": false,
  "data": "{\"grant_type\":\"client_credentials\",\"client_id\": \"WSCfCWDNSZVRQrX09GUKnAX0QdItmCBI\",\"client_secret\": \"8Mk54OqMDqBzZgm7fJuR4rPA-4T8GGPsqLir2aP432NnmG6EAJBCDl_r_fxPJ4x5\",\"audience\": \"rerum-cloud\"}"
}

$.ajax(settings).done(function (response) {
  console.log(response);
});