define([
    'angular',
    'angular-animate',
    'angular-cookies',
    'angular-resource',
    'angular-sanitize',
    'angular-touch',
    'angular-ui-router',
    'angular-translate',
    'angular-translate-loader-static-files',
    'tmhDynamicLocale',
    'ct-ui-router-extras',
    'angularMoment'
], function () {
    'use strict';
    angular.module('teacherApp', [
        'ngAnimate',
        'ngCookies',
        'ngResource',
        'ngSanitize',
        'ngTouch',
        'ui.router',
        'pascalprecht.translate',
        'tmh.dynamicLocale',
        'ct.ui.router.extras',
        'angularMoment'
    ]);

    angular.module('teacherApp')
        .config(['$futureStateProvider', '$controllerProvider', '$compileProvider', '$filterProvider',
            '$provide', 'routeResolverProvider', '$translateProvider',
            function ($futureStateProvider, $controllerProvider, $compileProvider, $filterProvider,
                      $provide, routeResolverProvider, $translateProvider) {
                var app = angular.module('teacherApp');

                app.register =
                {
                    controller: $controllerProvider.register,
                    directive: $compileProvider.directive,
                    filter: $filterProvider.register,
                    factory: $provide.factory,
                    service: $provide.service
                };

                $translateProvider.useStaticFilesLoader({
                    prefix: 'scripts/common/languages/locale-',
                    suffix: '.json'
                });

                // Loading states from .json file during runtime
                var loadAndRegisterFutureStates = function ($http, config) {
                    // $http.get().then() returns a promise
                    return $http.get('./sampleRoutes.json').then(function (resp) {
                        angular.forEach(resp.data, function (fstate) {
                            // Register each state returned from $http.get() with $futureStateProvider
                            if (fstate['routeEntry'] !== undefined) {
                                config.state[fstate['routeEntry']] = fstate['stateName'];
                            }
                            $futureStateProvider.futureState(fstate);
                        });
                    });
                };

                $futureStateProvider.stateFactory('requireCtrl',
                    routeResolverProvider.route.requireCtrl); // Register state factory that registers controller via eval.

                $futureStateProvider.addResolve(loadAndRegisterFutureStates);

            }]);

    angular.module('teacherApp')
        .run(function ($rootScope, $state, $window, $timeout, config, $q, $futureState, $translate) {
        });
});
