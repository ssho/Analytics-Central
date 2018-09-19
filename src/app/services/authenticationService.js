define([
  'angular',
  'underscore'
],
function (angular, _) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('authenticationService', function($rootScope,$location) {
    //block unauthenticated login
    return {
       isAuthenticated:function(){
          $rootScope.currentPage = $location.path();
          //if ($location.path().indexOf('dashboard') > 0 ) {
          //   $rootScope.cssStyle = "bootstrap.light.min.css";
          //} else {
          //   $rootScope.cssStyle = "bootstrap.css";
          //}
          if ($rootScope.authenticated) {
             return true;
          } else {
             $location.path('/login');
             return false;
          }
       }
    };
  });

});
