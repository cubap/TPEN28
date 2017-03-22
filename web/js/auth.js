var settings = {
  "async": true,
  "crossDomain": true,
  "url": "https://cubap.auth0.com/oauth/token",
  "method": "POST",
  "headers": {
    "content-type": "application/json"
  },
  "data": "{\"client_id\":\"WSCfCWDNSZVRQrX09GUKnAX0QdItmCBI\",\"client_secret\":\"8Mk54OqMDqBzZgm7fJuR4rPA-4T8GGPsqLir2aP432NnmG6EAJBCDl_r_fxPJ4x5\",\"audience\":\"http://rerum.io/api\",\"grant_type\":\"client_credentials\"}"
}

var getToken = function(){ $.ajax(settings).done(function (response) {
  console.log(response);
});
};