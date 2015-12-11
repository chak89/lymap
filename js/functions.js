(function () {
    var app = angular.module('lymap', ['ngResource', 'angucomplete-alt', 'ngAnimate', 'ui.bootstrap']);

    app
        .factory('orgUnits', function($http, $resource) {
            return {
                // Retrieve all organisational units

                getOrgUnits: function(callback) {
                    $http.get('http://localhost:8080/api/organisationUnits.json?paging=false&links=false').success(callback);
                },
                // Perform update on unit based on id

                orgUnit: function() {
                    return $resource('http://localhost:8080/api/organisationUnits/:id', {id: '@id'}, {
                        update: {
                            method: 'PUT'
                        }
                    });
                },

                getLevels: function(returnedData) {
                    $http.get('http://localhost:8080/api/organisationUnitLevels.json?paging=false&links=false').success(returnedData);
                },

                getLevel: function() {
                    return $resource('http://localhost:8080/api/organisationUnitLevels/:id', {name: '@id'}, {
                        method: 'GET',
                        isArray: true
                    });
                }
        };

    })

        .factory('orgUnitss', function($resource) {
            return $resource('http://localhost:8080/api/organisationUnits', {}, {
                create: {method: 'POST'}
            })
        })

        .factory('googleMaps', function($resource) {
            return {
                //check country
                checkCountry: function() {
                    return $resource('http://maps.googleapis.com/maps/api/geocode/json?latlng=:lat,:long&sensor=false', {lat: '@lat', long: '@long'}, {
                        method: 'GET',
                        isArray: true
                    });
                }
            }
        })


        // Shared Variable between mapController and AddUnitController

        .factory('SharedVariables', function () {
            var allUnits = [];
            return allUnits;
        })

        // Fetching indiviual facilities

        .factory('fetchUnit', function($resource) {

                return { 

            get: function () {
                    return $resource('http://localhost:8080/api/organisationUnits/:id', {id: '@id'}, {
                        method: 'GET'
                        
                    });
                }
            }
        })

        .service('changeUnits', function() {
            var units = [];

            return {
                update: function() {
                    return units;
                },

                set: function(value) {
                    units = value;
                }
            }
        })

        .controller('mapController', function($scope, $rootScope, changeUnits, SharedVariables,$http, $location, orgUnits,orgUnitss, $q, $window, $uibModal, $compile, googleMaps, $filter) {

            $scope.loader = document.getElementById('loader');

            // Set map options
            $scope.mapOptions = {
                zoom: 8,
                center: new google.maps.LatLng(9.0131, -12.9487),
                mapTypeId: google.maps.MapTypeId.TERRAIN
            };

            $scope.map = new google.maps.Map(document.getElementById('map'), $scope.mapOptions);

            $scope.markers = [];

            $scope.createInfoWindow = function(info, type, update) {

                var id = "'" + info.id + "'";

                var string = '<div class="infoWindowContent">' +
                    '<p> Opening Date: ' + $filter('date')(info.openingDate, 'M/d/yyyy') + '</p>' +
                    '<p> Level: ' + info.levelName + '</p>' +
                    '<p> Display name: ' + info.displayName + '</p>' +
                    '<p> Short name: ' + info.shortName + '</p>' +
                    '<div class="infoWindowContent"><button type="button" class="btn btn-default" ng-click="open(' + id + ')">Edit</button>' +
                    '</div>';

                var $btn = $compile(string)($scope);

                if (type == 'marker') {
                    $scope.infoWindow.setContent($btn[0]);
                    var content = $btn[0];

                    google.maps.event.addListener($scope.marker, 'click', (function(content) {
                        return function() {
                            $scope.infoWindow.setContent(content);
                            $scope.infoWindow.open($scope.map, this);
                            $scope.infoWindow['id'] = info.id;
                        }
                    })(content));

                    if (update) {
                        for (var i = 0; i < $scope.markers.length; i++) {
                            if ($scope.markers[i].id == info.id) {
                                google.maps.event.addListener($scope.markers[i], 'click', (function(content) {
                                    return function() {
                                        $scope.infoWindow.setContent(content);
                                        $scope.infoWindow.open($scope.map, this);
                                        $scope.infoWindow['id'] = info.id;
                                    }
                                })(content));
                            }
                        }
                    }
                    else {
                        $scope.infoWindow.open($scope.map, $scope.marker);
                        $scope.map.setCenter($scope.marker.getPosition());
                    }
                }
                else {

                    $scope.infoWindow.setContent($btn[0]);

                    $scope.polygon.addListener('click', function(e) {
                        $scope.infoWindow.setContent($btn[0]);
                        $scope.infoWindow.setPosition(e.latLng);
                        $scope.infoWindow.open($scope.map);
                        $scope.infoWindow['id'] = info.id;
                    });

                    if (update) {
                        var content = $btn[0];

                        for (var i = 0; i < $scope.polygons.length; i++) {
                            if ($scope.polygons[i].id == info.id) {
                                google.maps.event.addListener($scope.polygons[i], 'click', (function(content) {
                                    return function() {
                                        $scope.infoWindow.setContent(content);
                                        $scope.infoWindow.open($scope.map, this);
                                        $scope.infoWindow['id'] = info.id;
                                    }
                                })(content));
                            }
                        }
                    }
                }
            }

            $scope.infoWindow = new google.maps.InfoWindow();
            $scope.createMarker = function (info, flag) {

                if ($scope.marker && flag == false) {
                    $scope.marker.setMap(null);
                }

                if ($scope.polygon && flag == false) {
                    $scope.polygon.setMap(null);
                }
                //Get the coordinates and create an array
                $scope.coords = info.coordinates.replace(/[^0-9\-.,]+/g,"").split(',');

                //Create marker
                $scope.marker = new google.maps.Marker({
                    map: $scope.map,
                    position: new google.maps.LatLng($scope.coords[1], $scope.coords[0]),
                    title: info.name,
                    id: info.id
                });

                $scope.createInfoWindow(info, 'marker', false);

                if (flag) {
                    $scope.markers.push($scope.marker);
                }
            };

                $scope.polygons = [];

                $scope.createPolygon = function(info, flag) {

                    if ($scope.marker) {
                        $scope.marker.setMap(null);
                    }

                    $scope.coordInfo = [];
                    $scope.bounds = new google.maps.LatLngBounds();

                    //Get the coordinates and create an array
                    $scope.coords = info.coordinates.replace(/[^0-9\-.,]+/g,"").split(',');
                    for (var i = 0; i < $scope.coords.length; i++) {
                        if ( i % 2 == 0) {
                            $scope.coordInfo.push({lat: parseFloat($scope.coords[i + 1]), lng: parseFloat($scope.coords[i])});
                        }
                    }

                
                    $scope.polygon = new google.maps.Polygon({
                        paths: $scope.coordInfo,
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#FF0000',
                        fillOpacity: 0.35,
                        id: info.id
                    });

                    $scope.polygon.setMap($scope.map);
                    $scope.polygon['level_name'] = info.levelName;

                    $scope.map.setZoom(8);
                    $scope.map.setCenter({lat: $scope.coordInfo[0].lat, lng: $scope.coordInfo[0].lng});

                    $scope.createInfoWindow(info, 'polygon', false);

                    if (flag) {
                        $scope.polygons.push($scope.polygon);
                    }
                };

            $scope.Units = orgUnits.getOrgUnits(function(data) {

                    $scope.orgUnits = data;
                    $scope.orgUnitId = [];
                    for (var i = 0; i < $scope.orgUnits.organisationUnits.length; i++) {
                        //Iterate and get each unit one by one
                        $scope.orgUnitId.push(orgUnits.orgUnit().get({id: $scope.orgUnits.organisationUnits[i].id}).$promise);
                    }

                    //Instansiate the shared variable
                    $scope.allUnits = SharedVariables;

                    //$scope.allUnits = changeUnits;
                    //$scope.allUnits = [];
                        
                    //Wait until the data is fetched from the db
                    $q.all($scope.orgUnitId).then(function(units) {
                        //TODO reusable part
                        $scope.Levels = orgUnits.getLevels(function(data) {
                            $scope.levels = [];

                            for (var i = 0; i < data.organisationUnitLevels.length; i++) {

                                //Iterate and get each unit one by one, put into levelNames array
                                //$scope.levelNames.push($scope.levels.organisationUnitLevels[i]);
                                $scope.levels.push(orgUnits.getLevel().get({id: data.organisationUnitLevels[i].id}).$promise);
                            }

                            $scope.allLevels = [];
                            $q.all($scope.levels).then(function(levels) {
                                for (var i = 0; i < levels.length; i++) {
                                    $scope.allLevels.push(levels[i]);
                                }
                                for (var x = 0; x < units.length; x++) {
                                    if (!angular.isUndefined(units[x].coordinates) && units[x].featureType !== 'NONE')
                                    {
                                        for (var i = 0; i < $scope.allLevels.length; i ++) {

                                            if ($scope.allLevels[i].level === units[x].level) {
                                                units[x]['levelName'] = $scope.allLevels[i].name;
                                            }
                                        }
                                        $scope.allUnits.push(units[x]);
                                    }

                                }


                                $scope.searchUnits = $scope.allUnits;

                                $scope.$watch(function() {
                                    return changeUnits.update();
                                }, function(newVal, oldVal) {
                                    if (newVal.length > 0){
                                        $scope.allUnits = newVal;
                                        $scope.searchUnits = $scope.allUnits;
                                        $rootScope.$broadcast('search-change', $scope.searchUnits);
                                        for (var i = 0; i < $scope.allUnits.length; i++) {
                                            if ($scope.infoWindow.id == $scope.allUnits[i].id) {
                                                if ($scope.allUnits[i].featureType == 'POINT')
                                                    $scope.createInfoWindow($scope.allUnits[i], 'marker',  true);
                                                else
                                                    $scope.createInfoWindow($scope.allUnits[i], 'polygon', true);
                                            }
                                        }
                                    }
                                }, true);

                                $scope.unitSelected = function(selected) {
                                    if (selected) {
                                        for (var i = 0; i < $scope.allUnits.length; i++) {
                                            if ($scope.allUnits[i].name === selected.title) {
                                                if ($scope.allUnits[i].featureType === 'POINT') {
                                                    $scope.createMarker($scope.allUnits[i], false);
                                                }
                                                else if ($scope.allUnits[i].featureType === 'POLYGON' || $scope.allUnits[i].featureType === 'MULTI_POLYGON') {
                                                    if ($scope.polygon)
                                                        $scope.polygon.setMap(null);

                                                    $scope.createPolygon($scope.allUnits[i], false);
                                                }
                                            }
                                        }
                                    }
                                }

                                $scope.allFacilities = function() {
                                    $scope.clicked = !$scope.clicked;
                                    if ($scope.clicked) {
                                        if (!$scope.mc){
                                            for (var i = 0; i < $scope.allUnits.length; i++) {
                                                if ($scope.allUnits[i].levelName === 'Facility') {
                                                    $scope.createMarker($scope.allUnits[i], true);
                                                }
                                            }
                                            $scope.map.setZoom(8);

                                            $scope.mc = new MarkerClusterer($scope.map, $scope.markers, {
                                                maxZoom: 14
                                            });
                                        }
                                        else {
                                            $scope.mc.addMarkers($scope.markers);
                                        }
                                    }
                                    else {
                                        if ($scope.markers.length > 0) {
                                            $scope.mc.removeMarkers($scope.markers);
                                        }
                                    }
                                }

                                $scope.allChiefdoms = function() {
                                    $scope.cclicked = !$scope.cclicked;
                                    if ($scope.cclicked) {
                                        if ($scope.polygon)
                                            $scope.polygon.setMap(null);
                                        for (var i = 0; i < $scope.allUnits.length; i++) {
                                            if ($scope.allUnits[i].levelName === 'Chiefdom') {
                                                $scope.createPolygon($scope.allUnits[i], true);
                                            }
                                        }
                                        $scope.polName = 'Chiefdom';
                                    }
                                    else
                                    {
                                        for (var i = 0; i < $scope.polygons.length; i ++) {
                                            if ($scope.polygons[i].level_name === 'Chiefdom')
                                                $scope.polygons[i].setMap(null);
                                        }
                                        $scope.polygon.length = 0;
                                    }
                                }

                                $scope.allDistricts = function() {
                                    $scope.dclicked = !$scope.dclicked;
                                    if ($scope.dclicked) {
                                        for (var i = 0; i < $scope.allUnits.length; i++) {
                                            if ($scope.allUnits[i].levelName === 'District') {
                                                $scope.createPolygon($scope.allUnits[i], true);
                                            }
                                        }
                                    }
                                    else
                                    {
                                        for (var i = 0; i < $scope.polygons.length; i ++) {
                                            if ($scope.polygons[i].level_name === 'District')
                                                $scope.polygons[i].setMap(null);
                                        }
                                        $scope.polygon.length = 0;

                                    }

                                }

                                // hide loader when all the data is fetched and filtered
                                $scope.loader.className = "hide"
                            });
                        });
                        

                        //Modal editUnit
                        $scope.open = function(id) {
                            $uibModal.open({
                                animation: true,
                                templateUrl: 'editUnitContent.html',
                                controller: 'EditUnitController',
                                resolve: {
                                    id: function () {
                                        return id;
                                    }
                                }
                            });
                        };


                        // Initialize the listener for the add facility functionality

                        google.maps.event.addListener($scope.map, "rightclick",function(event){

                            showContextMenu(event.latLng);

                        });

                        //TODO improve this part
                        //remove menu if dragged, clicked somewhere or zoomed

                        google.maps.event.addListener($scope.map, 'click', function() {
                            $('.contextmenu').remove();
                        });

                        google.maps.event.addListener($scope.map, 'dragstart', function() {
                            $('.contextmenu').remove();
                        });

                        google.maps.event.addListener($scope.map, 'zoom_changed', function() {
                            $('.contextmenu').remove();
                        });

                        function showContextMenu(currentLatLng) {
                            var projection;
                            var contextmenuDir;
                            var latLng = "'" + currentLatLng + "'";
                            projection = $scope.map.getProjection() ;
                            $('.contextmenu').remove();
                            contextmenuDir = document.createElement("div");
                            contextmenuDir.className  = 'contextmenu';
                            var string = '<ul class="add-menu"><li ng-click="addUnit(' + latLng + ')">Add Organisation Unit</li></ul>';
                            contextmenuDir.appendChild($compile(string)($scope)[0]);
                            $($scope.map.getDiv()).append(contextmenuDir);

                            setMenuXY(currentLatLng);

                            contextmenuDir.style.visibility = "visible";
                        }

                        //Add Unit
                        $scope.addUnit = function(latlng) {
                            $scope.latlng = latlng.replace(/[^0-9\-.,]+/g,"").split(',');
                            googleMaps.checkCountry().get({lat: $scope.latlng[0], long: $scope.latlng[1]}).$promise.then(function(data) {
                                for (var i = 0; i < data.results[0].address_components.length; i++) {
                                    for (var x = 0; x < data.results[0].address_components[i].types.length; x++) {
                                        if (data.results[0].address_components[i].types[x] === 'country') {
                                            $scope.countryCode = data.results[0].address_components[i].short_name;
                                        }
                                    }
                                }
                                if ($scope.countryCode === 'SL') {

                                    $scope.newMarker = new google.maps.Marker({
                                        map: $scope.map,
                                        position: new google.maps.LatLng($scope.latlng[0], $scope.latlng[1])
                                    });


                                    // This will invoke a popup with form from the html script "addUnitContent.html" specified in index.html

                                    $uibModal.open({
                                        animation: true,
                                        templateUrl: 'addUnitContent.html',
                                        controller: 'AddUnitController',
                                        resolve: {
                                            marker: function() {
                                                return $scope.newMarker;
                                            }
                                        }
                                    });
                                }
                                else {
                                    alert('Please add only in Sierra Leone');
                                    $('.contextmenu').remove();
                                }
                            });

                        };

                        function getCanvasXY(currentLatLng){
                            var scale = Math.pow(2, $scope.map.getZoom());
                            var nw = new google.maps.LatLng(
                                $scope.map.getBounds().getNorthEast().lat(),
                                $scope.map.getBounds().getSouthWest().lng()
                            );
                            var worldCoordinateNW = $scope.map.getProjection().fromLatLngToPoint(nw);
                            var worldCoordinate = $scope.map.getProjection().fromLatLngToPoint(currentLatLng);
                            var caurrentLatLngOffset = new google.maps.Point(
                                Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
                                Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
                            );
                            return caurrentLatLngOffset;
                        }

                        function setMenuXY(currentLatLng){
                            var mapWidth = $('#map').width();
                            var mapHeight = $('#map').height();
                            var menuWidth = $('.contextmenu').width();
                            var menuHeight = $('.contextmenu').height();
                            var clickedPosition = getCanvasXY(currentLatLng);
                            var x = clickedPosition.x ;
                            var y = clickedPosition.y ;

                            if((mapWidth - x ) < menuWidth) //if to close to the map border, decrease x position
                                x = x - menuWidth;
                            if((mapHeight - y ) < menuHeight) //if to close to the map border, decrease y position
                                y = y - menuHeight;

                            $('.contextmenu').css('left',x);
                            $('.contextmenu').css('top',y);
                        };

                        google.maps.event.trigger($scope.map, "resize");

                    })
            });


                // Filter
                $scope.changeFilter = function (dataLevels) {
                    if (dataLevels != '') {
                        $scope.searchUnits = [];
                        for (var i = 0; i < $scope.allUnits.length; i++) {
                            if ($scope.allUnits[i].level == dataLevels) {
                                $scope.searchUnits.push($scope.allUnits[i]);
                            }
                        }
                    }
                    else
                        $scope.searchUnits = $scope.allUnits;

                    return $scope.searchUnits;
                }

        })


        // Controller for editing existing facilities

        .controller('EditUnitController', function($scope, $uibModalInstance, id, orgUnits, changeUnits, $rootScope, SharedVariables, $filter) {
            $scope.updateUnit = function(unit) {
                $scope.sent = false;
                $scope.edittedUnit = angular.copy(unit);
                $scope.units = SharedVariables;
                $scope.editUnit.$update(function() {}).then(function(success) {
                    if (success.httpStatusCode == 200) {
                        for (var i = 0; i < $scope.units.length; i ++)
                        {
                            if ($scope.units[i].id == id) {
                                if ($scope.edittedUnit.name) {
                                    $scope.units[i].name = $scope.edittedUnit.name;
                                    $scope.units[i].displayName = $scope.edittedUnit.name;
                                }

                                if ($scope.edittedUnit.shortName)
                                    $scope.units[i].shortName = $scope.edittedUnit.shortName;
                                if ($scope.edittedUnit.openingDate)
                                    $scope.units[i].openingDate = $filter('date')($scope.edittedUnit.openingDate, 'M/d/yyyy');
                            }
                        }
                        changeUnits.set($scope.units);
                    }
                });
                $uibModalInstance.dismiss('cancel');
            };

        orgUnits.orgUnit().get({id: id}).$promise.then(function(result) {
            $scope.editUnit = result;
            $scope.editUnit.openingDate = new Date($scope.editUnit.openingDate);
        });


        $scope.cancel = function() {
            $uibModalInstance.dismiss('cancel');
        }
    })




        //Controller for adding new facilities

        .controller('AddUnitController', function($scope, SharedVariables, $uibModalInstance, marker, orgUnitss, changeUnits, orgUnits) {  //Add addUnits?

           //Shared variable, defined in .factory.
            $scope.allUnits = SharedVariables;

            //Fetch all parents (level 3 units) from the shared array and save to $scope.allLevel3Units
            $scope.allLevel3Units=[];
            for (var i = 0; i < $scope.allUnits.length; i++) {
                if ($scope.allUnits[i].level == 3) {
                    $scope.allLevel3Units.push($scope.allUnits[i]);
                }
            }

            //Initialise dropdown list with item in index 0
            $scope.selectedParent = $scope.allLevel3Units[0];


          
            //Get the coordinates of the selected marker
            $scope.position = marker.getPosition();

            $scope.lat = $scope.position.lat();
            $scope.lng = $scope.position.lng();

            //Assign parent and coordinates to the given facility
            $scope.addFacility = {
                parent:{"id": $scope.selectedParent.id, "name": $scope.selectedParent.name},
                featureType:"POINT",
                coordinates:"[" + $scope.lng+ "," + $scope.lat + "]",

            };


            //Change parent according to the dropdown list
            $scope.changedValue=function(item){
                $scope.addFacility.parent.name=item.name;
                $scope.addFacility.parent.id=item.id;
            };


            // Add a new unit

            $scope.addUnit = function() {




                orgUnitss.save($scope.addFacility, function(addedObject) {

                        // This is the ID of the recently added object

                        $scope.addedID = addedObject.response.lastImported;

                        // .Debug
                        console.log($scope.addedID);

                        alert("Create success");

                        // In order to update the browser in real-time, one has to first fetch the unit from the DB, and then push it to 
                        // the temporary array of all units. After it has been pushed, the main array has to be updated with the temporary one.

                        orgUnits.orgUnit().get({id: $scope.addedID}).$promise.then(function(fetchedFacility) {

                        // .Debug
                        console.log(fetchedFacility);

                         // Push the fetched unit to the temporary array of units

                         $scope.allUnits.push(fetchedFacility);   

                         // Propogate the update of the main array       
                         changeUnits.set($scope.allUnits);

                        });

                    }
                );

                    
           
                $uibModalInstance.dismiss('cancel');
            };

            //close modals if clicked somewhere or cancelled
            $uibModalInstance.result.then(function(){}, function() {
                marker.setMap(null);
            });

            $scope.cancel = function() {
                $uibModalInstance.dismiss('cancel');
                marker.setMap(null);
            }
        });
})();