/**
 * UI-Router Extras: Sticky states, Future States, Deep State Redirect, Transition promise
 * Module: future
 * @version 1.0.5
 * @link http://github.com/jurrinus/ui-router-extras.git
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
(function(angular, undefined){
"use strict";
(function (angular, undefined) {
    var app = angular.module('ct.ui.router.extras.future', ['ct.ui.router.extras.core']);

    _futureStateProvider.$inject = ['$stateProvider', '$urlRouterProvider', '$urlMatcherFactoryProvider', 'uirextras_coreProvider'];
    function _futureStateProvider($stateProvider, $urlRouterProvider, $urlMatcherFactory, uirextras_coreProvider) {
        var stateFactories = {}, futureStates = {}, futureUrlPrefixes = {};
        var lazyloadInProgress = false, resolveFunctions = [], initPromise, initDone = false, promiseInit = false;
        var provider = this;

        // This function registers a promiseFn, to be resolved before the url/state matching code
        // will reject a route.  The promiseFn is injected/executed using the runtime $injector.
        // The function should return a promise.
        // When all registered promises are resolved, then the route is re-sync'ed.

        // Example: function($http) {
        //  return $http.get('//server.com/api/DynamicFutureStates').then(function(data) {
        //    angular.forEach(data.futureStates, function(fstate) { $futureStateProvider.futureState(fstate); });
        //  };
        // }
        this.addResolve = function (promiseFn) {
            resolveFunctions.push(promiseFn);
        };

        // Register a state factory function for a particular future-state type.  This factory, given a future-state object,
        // should create a ui-router state.
        // The factory function is injected/executed using the runtime $injector.  The future-state is injected as 'futureState'.

        // Example:
        //    $futureStateProvider.stateFactory('test', function(futureState) {
        //      return {
        //        name: futureState.stateName,
        //        url: futureState.urlFragment,
        //        template: '<h3>Future State Template</h3>',
        //        controller: function() {
        //          console.log("Entered state " + futureState.stateName);
        //        }
        //      }
        //    });
        this.stateFactory = function (futureStateType, factory) {
            stateFactories[futureStateType] = factory;
        };

        this.futureState = function (futureState) {
            futureStates[futureState.stateName] = futureState;
            var urlPrefix = futureState.urlPrefix;
            var index = futureState.urlPrefix.indexOf('?');
            var index = index === -1 ? futureState.urlPrefix.indexOf('/:') : index;
            var index = index === -1 ? futureState.urlPrefix.indexOf('/{') : index;
            if (index !== -1) {
                urlPrefix = futureState.urlPrefix.substr(0, index);
            }
            futureUrlPrefixes[urlPrefix] = futureState;
        };

        this.get = function () {
            return angular.extend({}, futureStates);
        };

        function assembleFutureStates($state, options) {
            if (options.url && options.url.length > 0) {
                var urlComponents = options.url.split(/\./);
                var stateName = '';
                while (urlComponents.length) {
                    var urlPrefix = urlComponents.join("/");
                    var stateNames = futureUrlPrefixes[urlPrefix].stateName.split('.');
                    stateNames.splice(stateNames.length - 1, 1);
                    var states = [futureUrlPrefixes[urlPrefix]];
                    while (stateNames.length > 0) {
                        stateName = stateNames.join('.');

                        if (futureStates[stateName] !== undefined && !$state.get(stateName)) {
                            states.push(futureStates[stateName])
                        }
                        stateNames.splice(stateNames.length - 1, 1);
                    }
                    return states;
                }

            } else if (options.name && options.name.length > 0) {
                var stateNames = options.name.split('.');
                var states = [];
                while (stateNames.length > 0) {
                    stateName = stateNames.join('.');

                    if (futureStates[stateName] !== undefined && !$state.get(stateName)) {
                        states.push(futureStates[stateName])
                    }
                    stateNames.splice(stateNames.length - 1, 1);
                }
                return states;
            }
        }

        function lazyLoadState($injector, futureStates) {
            if (!futureStates && futureState.length > 0) {
                var deferred = $q.defer();
                deferred.reject("No lazyState passed in " + futureStates);
                return deferred.promise;
            }
            // one type must fit all
            var type = futureStates[0].type;
            var factory = stateFactories[type];
            if (!factory) {
                throw Error("No state factory for futureState.type: " + (futureStates && futureState[0].type));
            }
            return $injector.invoke(factory, factory, {futureStates: futureStates});
        }

        function futureState_otherwise($injector, $location) {
            var resyncing = false;
            var $log = $injector.get("$log");

            var otherwiseFunc = ['$state',
                function otherwiseFunc($state) {
                    $log.debug("Unable to map " + $location.path());
                    $location.url("/");
                }];

            var lazyLoadMissingState =
                ['$rootScope', '$urlRouter', '$state',
                    function lazyLoadMissingState($rootScope, $urlRouter, $state) {
                        if (promiseInit) {
                            if (!initDone) {
                                // Asynchronously load state definitions, then resync URL
                                initPromise().then(function initialResync() {
                                    resyncing = true;
                                    $urlRouter.sync();
                                    resyncing = false;
                                });
                                initDone = true;
                                return;
                            }


                            var _futureStates = assembleFutureStates($state, {url: $location.path()});
                            if (!_futureStates) {
                                return $injector.invoke(otherwiseFunc);
                            }

                            lazyloadInProgress = true;
                            // Config loaded.  Asynchronously lazy-load state definition from URL fragment, if mapped.
                            lazyLoadState($injector, _futureStates).then(function lazyLoadedStateCallback(states) {
                                for (var i = 0; i < states.length; i++) {
                                    if (states[i] && !$state.get(states[i]))
                                        $stateProvider.state(states[i]);
                                }
                                resyncing = true;
                                $urlRouter.sync();
                                resyncing = false;
                                lazyloadInProgress = false;
                            }, function lazyLoadStateAborted() {
                                lazyloadInProgress = false;
                                $state.go("top");
                            });
                        }
                    }];
            if (lazyloadInProgress) return;

            var nextFn = resyncing ? otherwiseFunc : lazyLoadMissingState;
            return $injector.invoke(nextFn);
        }

        $urlRouterProvider.otherwise(futureState_otherwise);

        var serviceObject = {
            getResolvePromise: function () {
                return initPromise();
            }
        };

        // Used in .run() block to init
        this.$get = ['$injector', '$state', '$q', '$rootScope', '$urlRouter', '$timeout', '$log',
            function futureStateProvider_get($injector, $state, $q, $rootScope, $urlRouter, $timeout, $log) {
                function init() {
                    $rootScope.$on("$stateNotFound", function futureState_notFound(event, unfoundState, fromState, fromParams) {
                        if (lazyloadInProgress) return;
                        $log.debug("event, unfoundState, fromState, fromParams", event, unfoundState, fromState, fromParams);

                        var futureStates = assembleFutureStates($state, {name: unfoundState.to});
                        if (!futureStates.length > 0) return;

                        event.preventDefault();
                        lazyloadInProgress = true;

                        var promise = lazyLoadState($injector, futureStates);
                        promise.then(function (states) {
                            // TODO: Should have a specific resolve value that says 'dont register a state because I already did'
                            for (var i = 0; i < states.length; i++) {
                                if (states[i] && !$state.get(states[i]))
                                    $stateProvider.state(states[i]);
                            }
//                                    if (state)
//                                        $stateProvider.state(state);
                            $state.go(unfoundState.to, unfoundState.toParams);
                            lazyloadInProgress = false;
                        }, function (error) {
                            console.log("failed to lazy load state ", error);
                            $state.go(fromState, fromParams);
                            lazyloadInProgress = false;
                        });
                    });

                    // Do this better.  Want to load remote config once, before everything else
                    if (!initPromise) {
                        var promises = [];
                        angular.forEach(resolveFunctions, function (promiseFn) {
                            promises.push($injector.invoke(promiseFn));
                        });
                        initPromise = function () {
                            return $q.all(promises);
                        };
//          initPromise = _.once(function flattenFutureStates() {
//            var allPromises = $q.all(promises);
//            return allPromises.then(function(data) {
//              return _.flatten(data);
//            });
//          });
                    }

                    // TODO: analyze this. I'm calling $urlRouter.sync() in two places for retry-initial-transition.
                    // TODO: I should only need to do this once.  Pick the better place and remove the extra resync.
                    initPromise().then(function retryInitialState() {
                        $timeout(function () {
                            if ($state.transition) {
                                $state.transition.then($urlRouter.sync, $urlRouter.sync);
                            } else {
                                $urlRouter.sync();
                            }
                        });
                    });
                    promiseInit = true; //used to disable during unit testing
                }

                init();

                serviceObject.state = $stateProvider.state;
                serviceObject.futureState = provider.futureState;
                serviceObject.get = provider.get;

                return serviceObject;
            }];
    };

    app.provider('$futureState', _futureStateProvider);

    var statesAddedQueue = {
        state: function (state) {
            if (statesAddedQueue.$rootScope)
                statesAddedQueue.$rootScope.$broadcast("$stateAdded", state);
        },
        itsNowRuntimeOhWhatAHappyDay: function ($rootScope) {
            statesAddedQueue.$rootScope = $rootScope;
        },
        $rootScope: undefined
    };

    app.config(['$stateProvider', function ($stateProvider) {
        // decorate $stateProvider.state so we can broadcast when a real state was added
        var realStateFn = $stateProvider.state;
        $stateProvider.state = function state_announce() {
            var val = realStateFn.apply($stateProvider, arguments);

            var state = angular.isObject(arguments[0]) ? arguments[0] : arguments[1];
            statesAddedQueue.state(state);
            return val;
        };
    }]);

    // inject $futureState so the service gets initialized via $get();
    app.run(['$rootScope', function ($rootScope) {
        statesAddedQueue.itsNowRuntimeOhWhatAHappyDay($rootScope);
    }]);

})(angular);

})(angular);