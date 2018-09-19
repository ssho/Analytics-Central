/*! elastic.js - v1.0.0 - 2013-03-05
* https://github.com/fullscale/elastic.js
* Copyright (c) 2013 FullScale Labs, LLC; Licensed MIT */

/*jshint browser:true */
/*global angular:true */
/*jshint es5:true */
'use strict';

/* 
Angular.js service wrapping the elastic.js API. This module can simply
be injected into your angular controllers. 
*/
angular.module('solrjs.service', [])
  .factory('sjsResource', ['$http', function ($http) {

  return function (url) {

    var DEBUG = false; //false; // DEBUG mode
    var extraHeader = "";
    var
      // use existing sjs object if it exists
      sjs = window.sjs || {},

      /* results are returned as a promise */
      promiseThen = function (httpPromise, successcb, errorcb) {
        return httpPromise.then(function (response) {
          (successcb || angular.noop)(response.data);
          return response.data;
        }, function (response) {
          (errorcb || angular.noop)(response.data);
          return response.data;
        });
      };

    // set url to empty string if it was not specified
    if (url == null) {
      url = '';
    }

    /* implement the solr.js client interface for angular */
    sjs.client = {
      server: function (s) {
        if (s == null) {
          return url;
        }
      
        url = s;
        return this;
      },
      addExtraHeader:function(s){
        extraHeader = 'Bearer '+s;
        //console.debug("adding extra header" + extraHeader);
        return this;
      },
      post: function (path, data, successcb, errorcb) {
        // console.debug("inside post");
        var config = {};
        var isUpdate = path.indexOf('/update');

        if (DEBUG) { console.debug('solr-angular-client: url=',url,', path=',path,', isUpdate=',isUpdate); }

        if (isUpdate !== -1) {
          //if (extraHeader.length == 0 ) {
          //    config = { headers: {'Content-type':'application/json'} };
          //} else {
              config = { headers: {'Content-type':'application/json','Authorization':extraHeader} };
          //}
        } else {
          //if (extraHeader.length == 0 ) {
          //    config = { headers: {'Content-type':'application/x-www-form-urlencoded'} };
          //} else {
              config = { headers: {'Content-type':'application/x-www-form-urlencoded','Authorization':extraHeader} };
          //}
        }
        //console.debug("config xxx header :"+ JSON.stringify(config));
        //console.debug("config yyy header :"+ path + "token:" + extraHeader);
        path = url + path;
        if (DEBUG) { console.debug('solr-angular-client: POST url=',url,', path=',path,', data=',data,',config=',JSON.stringify(config)); }
        return promiseThen($http.post(path, data, config), successcb, errorcb);
      },
      get: function (path, data, successcb, errorcb) {
        //console.debug("inside get");
        //if (extraHeader.length == 0 ) {
        //    config = { headers: {} };
        //} else {
            config = { headers: {'Authorization':extraHeader} };
        //}
        path = url + path + '?' + data;
        if (DEBUG) { console.debug('solr-angular-client: GET url=',url,', path=',path,', data=',data); }
        return promiseThen($http.get(path,config), successcb, errorcb);
      },
      put: function (path, data, successcb, errorcb) {
       //console.debug("inside put");
        path = url + path;
        return promiseThen($http.put(path, data), successcb, errorcb);
      },
      del: function (path, data, successcb, errorcb) {
         //console.debug("inside del");
        path = url + path;
        return promiseThen($http.delete(path, data), successcb, errorcb);
      },
      head: function (path, data, successcb, errorcb) {
         //console.debug("inside head");
        path = url + path;
        return $http.head(path, data)
          .then(function (response) {
          (successcb || angular.noop)(response.headers());
          return response.headers();
        }, function (response) {
          (errorcb || angular.noop)(undefined);
          return undefined;
        });
      }

    };
  
    return sjs;
  };
}]);
