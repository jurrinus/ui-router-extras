(function (angular) {
    var app = angular.module('jtb.ui.router.route.extras', []);

    function _futureRouteProvider() {
        'use strict';
        this.$get = function () {
            return this;
        };

        this.route = (function () {
            var requireCtrl = function ($q, futureStates) {
                var defer = $q.defer(),
                    statePromises = assembleStates($q, futureStates);
                $q.all(statePromises)
                    .then(function (states) {
                        defer.resolve(states.reverse());
                    }, function (error) {
                        defer.reject(error);
                    });
                return defer.promise;
            };

            var copyState = function (futureState) {
                var stateData = {
                    'abstract': futureState.abstract || false,
                    'name': futureState.stateName,
                    'url': futureState.url,
                    'data': futureState.data || {}

                };
                if (futureState.sticky) {
                    stateData['sticky'] = futureState.sticky;
                }
                if (futureState.deepStateRedirect) {
                    stateData['deepStateRedirect'] = futureState.deepStateRedirect;
                }

                return stateData;
            };

            var assembleStates = function ($q, futureStates) {
                var states = [];
                for (var i = 0, max = futureStates.length; i < max; i++) {
                    var futureState = futureStates[i];

                    if (futureState.views) {
                        states.push(assembleViews($q, futureState));
                    } else {
                        if (futureState.controller) {
                            states.push(assembleView($q, futureState));
                        } else {
                            states.push(function ($q, futureState) {
                                var defer = $q.defer();

                                var stateData = copyState(futureState);
                                stateData['templateUrl'] = futureState.templateUrl;

                                defer.resolve(stateData);

                                return defer.promise;
                            });
                        }
                    }
                }
                return states;
            };

            var assembleViews = function ($q, futureState) {
                var defer = $q.defer(),
                    state = {};
                if (futureState.views) {
                    var ctrl = [];
                    for (var view in futureState.views) {
                        if (futureState.views.hasOwnProperty(view)) {
                            if (futureState.views[view].controller) {
                                ctrl.push(futureState.views[view].controller);
                            }
                        }
                    }
                    require(ctrl, function () {
                        var stateData = copyState(futureState);
                        stateData['views'] = {};
                        angular.copy(futureState.views, stateData['views']);
                        var keys = Object.keys(futureState.views);

                        for (var i = 0, j = arguments.length; i < j; i++) {
                            stateData.views[keys[i]].controller = arguments[i];
                        }
                        defer.resolve(stateData);
                    });
                }
                return defer.promise;
            };

            var assembleView = function ($q, futureState) {
                var defer = $q.defer();

                require([futureState.controller], function (ctrl) {
                    var stateData = copyState(futureState);
                    stateData['templateUrl'] = futureState.templateUrl;

                    // Resolve the promise with the full UI-Router state.
                    defer.resolve(stateData);
                });
                return defer.promise;
            };
            return {
                'requireCtrl': requireCtrl
            };
        })();
    };

    app.provider('$futureRoute', _futureRouteProvider);

})(angular);
