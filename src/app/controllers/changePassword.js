define([
        'angular',
        'config',
        'app',
        'underscore'
    ],
    function (angular, config, app, _) {
        'use strict';

        var module = angular.module('kibana.controllers');

        module.controller('ChangePasswordCtrl', function ($scope, $rootScope, $location, $http) {

            var passwordRegexp = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,16})");
            $scope.init = function () {
                $scope.currentPassword = "";
                $scope.newPassword = "";
                $scope.confirmNewPassword = "";
            };

            function passwordValidation() {
                var hasWhiteSpace = false;
                var isValidPassword = false;
                if ($scope.newPassword === $scope.confirmNewPassword) {
                    if ($scope.newPassword != '' && $scope.confirmNewPassword != '') {
                        //return newPassword.match(passwordRegexp);
                        if ($scope.newPassword.indexOf(' ') >= 0) hasWhiteSpace = true;
                        isValidPassword = $scope.newPassword.match(passwordRegexp);
                        if (isValidPassword && !hasWhiteSpace) {
                            return true;
                        } else {
                            // console.log("bad rule password");
                            $scope.hasErrorMessage = true;
                            $scope.errorMessage = "Password must be at least 1 upper, lower, digit, special " +
                                "character with 8 to 16 char length and no space.";
                            return false;
                        }
                    } else {
                        $scope.hasErrorMessage = true;
                        $scope.errorMessage = "New Password & Confirm New Password cannot be empty!";
                        return false;
                    }
                } else {
                    $scope.hasErrorMessage = true;
                    $scope.errorMessage = "New Password & Confirm New Password do not match!";
                    return false;
                }
            }

            $scope.ChangePassword = function() {
                    $scope.hasErrorMessage = false;
                    $scope.errorMessage = "";                  
                    if ($scope.passwordPolicy = passwordValidation()) $scope.checkCurrentPassword();             
            };
            $scope.checkCurrentPassword = function(){                      
                   $http({
                      url : config.sitehttp + config.siteURL + config.oauthURL,
                      headers :  {'Content-Type': 'application/x-www-form-urlencoded',
                                  'Authorization': "Basic " + btoa(config.client_id + ':' + config.client_secret) },
                      method: 'POST',
                      data: "password=" + encodeURIComponent($scope.currentPassword) + "&username=" + $rootScope.currentUser
                         +  "&grant_type=" + config.grant_type + "&scope=" + config.scope
                         +  "&client_secret=" + config.client_secret + "&client_id=" + config.client_id
                   }).then(function(response) {
                      $rootScope.token = response.data.access_token;  // Current password correct , then update token and change password
                      $scope.callChangePassword();
                   },function(response) { //error                    
                      $scope.errorMessage = "Current password was incorrect, Cannot update new password.";
                      $scope.hasErrorMessage = true;                      
                   });


            };
            $scope.callChangePassword = function(){
                    var formData = {
                                    currentPassword:$scope.currentPassword,
                                    newPassword:($scope.newPassword),
                                    confirmPassword:($scope.confirmNewPassword),
                                    userId:$rootScope.currentUserId};
                    $http({
                        url : config.sitehttp + config.siteURL + config.changePassword,                    
                        headers : {'Content-Type': 'application/json',
                                   'Authorization': 'Bearer ' + $rootScope.token },
                        method: 'POST',
                        data: formData
                    }).then(function(response) {
                        //console.log("succeed"+JSON.stringify(response));
                        $scope.init();
                        $scope.hasErrorMessage= true;
                        $scope.errorMessage = response.data;                      
                    },function(response) { // error                      
                        //console.log("failed:" + JSON.stringify(response));
                        $scope.init();
                        $scope.hasErrorMessage= true;
                        $scope.errorMessage = response.data;                        
                    });
            };
        });
    });