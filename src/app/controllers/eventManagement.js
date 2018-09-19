define([
        'angular',
        'config',
        'app',
        'underscore'
    ],
    function (angular, config, app, _) {
        'use strict';

        var module = angular.module('kibana.controllers');

        module.directive('datepicker', function () {
            return {
                restrict: 'C',
                require: 'ngModel',
                link: function (scope, element, attrs, ngModelCtrl) {
                    $(element).datepicker({
                        dateFormat: 'dd, MM, yy',
                        onSelect: function (date) {
                            scope.date = date;
                            scope.$apply();
                        }
                    });
                }
            };
        });

        module.controller('eventManagementCtrl', function ($scope, $rootScope, $location, $http) {
                $scope.eventDateEdit = '';
                $scope.eventNameEdit = '';
                $scope.search = '';
                $scope.keyname = 'date';
                $scope.reverse = false;
                $scope.currentPage = 0;
                $scope.pageSize = 10;
                $scope.events = [];
                $scope.init = function () {
                };
                $scope.numberOfPages = function () {
                    return Math.ceil($scope.events.length / $scope.pageSize);
                };
                $scope.sort = function (keyname) {
                    console.log('sort clickd' + keyname);
                    $scope.sortKey = keyname;   //set the sortKey to the param passed
                    if (keyname != $scope.sortKey) {
                        // key changed, reset reverse
                        $scope.reverse = true
                    } else {
                        $scope.reverse = !$scope.reverse; //if true make it false and vice versa
                    }
                    console.log('reverse : ' + $scope.reverse);
                };
                $scope.validationCheck = function () {
                    console.log('check');
                    console.log($scope.eventDateEdit);
                    console.log($scope.eventNameEdit);
                    return true;
                };
                $scope.getAllEvents = function () {
                    $scope.hasErrorMessage = false;
                    var fromDate = '2000/1/1';
                    var toDate = '3000/1/1'; // all date
                    $http({
                        url: config.sitehttp + config.siteURL + config.getEventURL + '?startDate=' + fromDate + '&endDate=' + toDate,
                        headers: {'Authorization': 'Bearer ' + $rootScope.token},
                        cache: false,
                        method: 'GET'
                    }).then(function (response) {
                        // assign data to array
                        console.log("data:" + JSON.stringify(response.data));
                        var data = response.data;

                        $scope.events = [];
                        for (eventItem in data) {
                            var eventItem = {
                                "id": data[eventItem].id,
                                "date": moment(data[eventItem].eventDate).format('MM-DD-YYYY'),
                                //"date": new Date(data[eventItem].eventDate),
                                "name": data[eventItem].eventName
                            };
                            $scope.events.push(eventItem);
                        }
                    }, function (response) { //error
                        if (response.data.error === 'invalid_token') {
                        }
                        $scope.errorMessage = "Error on get events.";
                        $scope.hasErrorMessage = true;
                    });
                };
                $scope.eventInsert = function () {
                    console.log('do insert');
                    console.log($scope.eventDate);
                    console.log($scope.eventName);
                    $scope.hasErrorMessage = false;
                    $scope.hasMessage = false;
                    $http({
                        url: config.sitehttp + config.siteURL + config.eventInsert,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + $rootScope.token
                        },
                        method: 'POST',
                        data: {
                            eventId: 0,
                            eventDate: $scope.eventDate,
                            eventName: $scope.eventName,
                            eventType: 'client',
                            recurrent: 1
                        }
                    }).then(function (response) {
                        $scope.getAllEvents();
                        $scope.Message = "Event added.";
                        $scope.hasMessage = true;
                    }, function (response) { //error
                        $scope.errorMessage = "Error on Add an Event ";
                        $scope.hasErrorMessage = true;
                    });
                };

                $scope.eventEdit = function (event) {
                    //preset edit value
                    $scope.eventDateEdit = moment(event.date).format('YYYY-MM-DD');
                    $scope.eventNameEdit = event.name;
                    $scope.eventIdEdit = event.id;
                };

                //Update fields when populated fields are touched.
                $scope.fieldEventDateUpdate = function (newDate) {
                    $scope.eventDateEdit = moment(newDate).format('YYYY-MM-DD');
                };
                $scope.fieldEventNameUpdate = function (newEventName) {
                    $scope.eventNameEdit = newEventName;
                };

                $scope.eventUpdate = function () {
                    console.log('do update');
                    console.log($scope.eventDateEdit);
                    console.log($scope.eventNameEdit);
                    console.log($scope.eventIdEdit);
                    $scope.hasErrorMessage = false;
                    $scope.hasMessage = false;
                    $http({
                        url: config.sitehttp + config.siteURL + config.eventUpdate + "/" + $scope.eventIdEdit,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + $rootScope.token
                        },
                        method: 'PUT',
                        data: {
                            eventName: $scope.eventNameEdit,
                            eventDate: $scope.eventDateEdit,
                            eventType: 'client',
                            recurrent: 1
                        }

                    }).then(function (response) {
                        $scope.getAllEvents();
                        $scope.Message = "Event updated.";
                        $scope.hasMessage = true;
                    }, function (response) { //error
                        $scope.errorMessage = "Error on update a event.";
                        $scope.hasErrorMessage = true;
                    });
                    $scope.getAllEvents();
                };

                $scope.eventDelete = function (eventId) {
                    console.log('do delete');
                    console.log('eventId:' + eventId);
                    $scope.hasErrorMessage = false;
                    $scope.hasMessage = false;
                    $http({
                        url: config.sitehttp + config.siteURL + config.eventDelete + '/' + eventId,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + $rootScope.token
                        },
                        method: 'DELETE'
                    }).then(function (response) {
                        $scope.getAllEvents();
                        $scope.Message = "Event deleted";
                        $scope.hasMessage = true;
                    }, function (response) { //error
                        $scope.errorMessage = "Error on delete a event.";
                        $scope.hasErrorMessage = true;
                    });
                };
                $scope.getAllEvents();
            }
        );
    });
