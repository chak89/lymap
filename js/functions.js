(function () {
    var app = angular.module('lymap', ['ngResource', 'angucomplete-alt', 'ngAnimate', 'ui.bootstrap']);
    var baseUrl;

    app
        .factory('orgUnits', function($http, $resource) {
            return {
                getManifest: function(callback) {
                    $http.get('manifest.webapp').success(callback);
                },
                // Retrieve all organisational units
                getOrgUnits: function(callback) {
                    $http.get( baseUrl + '/organisationUnits.json?paging=false&links=false').success(callback);
                },
                // Perform update on unit based on id

                orgUnit: function() {
                    return $resource(baseUrl + '/organisationUnits/:id', {id: '@id'}, {
                        update: {
                            method: 'PUT'
                        }
                    });
                },

                getLevels: function(returnedData) {
                    $http.get( baseUrl + '/organisationUnitLevels.json?paging=false&links=false').success(returnedData);
                },

                getLevel: function() {
                    return $resource( baseUrl + '/organisationUnitLevels/:id', {name: '@id'}, {
                        method: 'GET',
                        isArray: true
                    });
                },
                createUnit: function() {
                    return $resource( baseUrl + '/organisationUnits', {}, {
                        create: {method: 'POST'}
                    })
                }
        };

    })

        .factory('googleMaps', function($resource) {
            return {
                //check country
                checkCountry: function() {
                    return $resource('https://maps.googleapis.com/maps/api/geocode/json?latlng=:lat,:long&sensor=false', {lat: '@lat', long: '@long'}, {
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

        .controller('mapController', function($scope, $rootScope, changeUnits, SharedVariables,$http, $location, orgUnits, $q, $window, $uibModal, $compile, googleMaps, $filter) {

            // initialize variables
            var map, id, string, $btn, content, infoWindow, marker, polygon, coords, createInfoWindow, createMarker, createPolygon;

            orgUnits.getManifest(function(data) {
                baseUrl = data.activities.dhis.href + "/api";
                initUnits();
            });

            $scope.loader = document.getElementById('loader');

            // Set map options
            var mapOptions = {
                zoom: 8,
                center: new google.maps.LatLng(9.0131, -12.9487),
                mapTypeId: google.maps.MapTypeId.TERRAIN
            };

            map = new google.maps.Map(document.getElementById('map'), mapOptions);

            infoWindow = new google.maps.InfoWindow();

            var markers = [],
                polygons = [],
                levels = [];

            //update the infoWindow on edit
           createInfoWindow = function(info, type) {

                id = "'" + info.id + "'";

               //create the string for the infoWIndow
               string = '<div class="infoWindowContent">' +
                   '<h3>' + info.name + '</h3>' +
                   '<p> Opening Date: <span>' + $filter('date')(info.openingDate, 'M/d/yyyy') + '</span></p>' +
                   '<p> Level: <span>' + info.levelName + '</span></p>' +
                   '<p> Display name: <span>' + info.displayName + '</span></p>' +
                   '<p> Short name: <span>' + info.shortName + '</span></p>' +
                   '<div class="infoWindowContent"><button type="button" class="btn btn-primary" ng-click="open(' + id + ')">Edit</button>' +
                   '</div>';

               //compile it in order to get into angular scope
                $btn = $compile(string)($scope);

               //check if its marker or polygon
                if (type == 'marker') {
                    infoWindow.setContent($btn[0]);
                    content = $btn[0];

                        for (var i = 0; i < markers.length; i++) {
                            //check if the marker is in the markers array
                            if (markers[i].id == info.id) {
                                google.maps.event.addListener(markers[i], 'click', (function(content) {
                                    return function() {
                                        infoWindow.setContent(content);
                                        infoWindow.open(map, this);
                                        infoWindow['id'] = info.id;
                                    }
                                })(content));
                            }
                        }
                }
                else {
                        content = $btn[0];
                        for (var i = 0; i < polygons.length; i++) {
                            //check if the polygon is in the polygons array
                            if (polygons[i].id == info.id) {
                                google.maps.event.addListener(polygons[i], 'click', (function(content) {
                                    return function() {
                                        infoWindow.setContent(content);
                                        infoWindow.open(map, this);
                                        infoWindow['id'] = info.id;
                                    }
                                })(content));
                            }
                        }
                    }
            }
            //create Marker
            createMarker = function (info, flag) {

                //remove markers or polygons if other marker clicked
                if (marker && flag == false) {
                    marker.setMap(null);
                }

                if (polygon && flag == false) {
                    polygon.setMap(null);
                }
                //Get the coordinates and create an array
                coords = info.coordinates.replace(/[^0-9\-.,]+/g,"").split(',');

                //Create marker
                marker = new google.maps.Marker({
                    map: map,
                    position: new google.maps.LatLng(coords[1], coords[0]),
                    title: info.name,
                    id: info.id
                });

                id = "'" + info.id + "'";

                //create InfoWindow String
                string = '<div class="infoWindowContent">' +
                    '<h3>' + info.name + '</h3>' +
                    '<p> Opening Date: <span>' + $filter('date')(info.openingDate, 'M/d/yyyy') + '</span></p>' +
                    '<p> Level: <span>' + info.levelName + '</span></p>' +
                    '<p> Display name: <span>' + info.displayName + '</span></p>' +
                    '<p> Short name: <span>' + info.shortName + '</span></p>' +
                    '<div class="infoWindowContent"><button type="button" class="btn btn-primary" ng-click="open(' + id + ')">Edit</button>' +
                    '</div>';

                //Compile in order to get into angular scope
                $btn = $compile(string)($scope);

                //add Click listener
                google.maps.event.addListener(marker, 'click', (function(content) {
                    return function() {
                        infoWindow.setContent(content);
                        infoWindow.open(map, this);
                        infoWindow['id'] = info.id;
                    }
                })($btn[0]));

                //push in the markers array if its only 1 marker clicked
                if (flag) {
                    markers.push(marker);
                }
            };

            //Create Polygon
            createPolygon = function(info, flag) {

                //remove markers if other clicked
                if (marker) {
                    marker.setMap(null);
                }

                var coordInfo = [];

                //Get the coordinates and create an array
                coords = info.coordinates.replace(/[^0-9\-.,]+/g,"").split(',');
                for (var i = 0; i < coords.length; i++) {
                    if ( i % 2 == 0) {
                        coordInfo.push({lat: parseFloat(coords[i + 1]), lng: parseFloat(coords[i])});
                    }
                }


                polygon = new google.maps.Polygon({
                    paths: coordInfo,
                    strokeColor: '#FF0000',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#FF0000',
                    fillOpacity: 0.35,
                    id: info.id
                });

                polygon.setMap(map);
                polygon['level_name'] = info.levelName;

                map.setZoom(8);
                map.setCenter({lat: coordInfo[0].lat, lng: coordInfo[0].lng});

                id = "'" + info.id + "'";

                //create String
                string = '<div class="infoWindowContent">' +
                    '<h3>' + info.name + '</h3>' +
                    '<p> Opening Date: <span>' + $filter('date')(info.openingDate, 'M/d/yyyy') + '</span></p>' +
                    '<p> Level: <span>' + info.levelName + '</span></p>' +
                    '<p> Display name: <span>' + info.displayName + '</span></p>' +
                    '<p> Short name: <span>' + info.shortName + '</span></p>' +
                    '<div class="infoWindowContent"><button type="button" class="btn btn-primary" ng-click="open(' + id + ')">Edit</button>' +
                    '</div>';


                //Compile in order to get into angular scope
                $btn = $compile(string)($scope);

                //add click listener to open infowindow anyplace clicked
                polygon.addListener('click', function(e) {
                    infoWindow.setContent($btn[0]);
                    infoWindow.setPosition(e.latLng);
                    infoWindow.open(map);
                    infoWindow['id'] = info.id;
                });

                google.maps.event.addListener(polygon, 'click', (function(content) {
                    return function() {
                        infoWindow.setContent(content);
                        infoWindow.open(map, this);
                        infoWindow['id'] = info.id;
                    }
                })($btn[0]));

                // push in the array of polygons if more polygons fetched
                if (flag) {
                    polygons.push(polygon);
                }
            };

            function initUnits() {
                $scope.Units = orgUnits.getOrgUnits(function(data) {

                    $scope.orgUnits = data;
                    var orgUnitId = [];
                    for (var i = 0; i < $scope.orgUnits.organisationUnits.length; i++) {
                        //Iterate and get each unit one by one
                        orgUnitId.push(orgUnits.orgUnit().get({id: $scope.orgUnits.organisationUnits[i].id}).$promise);
                    }

                    //Instansiate the shared variable
                    $scope.allUnits = SharedVariables;
                        
                    //Wait until the data is fetched from the db
                    $q.all(orgUnitId).then(function(units) {
                        //TODO reusable part
                        var Levels = orgUnits.getLevels(function(data) {

                            for (var i = 0; i < data.organisationUnitLevels.length; i++) {

                                //Iterate and get each unit one by one, put into levelNames array
                                levels.push(orgUnits.getLevel().get({id: data.organisationUnitLevels[i].id}).$promise);
                            }

                            $scope.allLevels = [];
                            $q.all(levels).then(function(levels) {
                                for (var i = 0; i < levels.length; i++) {
                                    $scope.allLevels.push(levels[i]);
                                }
                                for (var x = 0; x < units.length; x++) {
                                    //check for coordinates and featuretype, its a big in the DB
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

                                //set the searchUnits for the autocompleter
                                $scope.searchUnits = $scope.allUnits;



                                // hide loader when all the data is fetched and filtered
                                $scope.loader.className = "hide"
                            });
                        });
                        



                    })
                });
            }


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
            google.maps.event.addListener(map, "rightclick",function(event){
                showContextMenu(event.latLng);
            });

            //TODO improve this part
            //remove menu if dragged, clicked somewhere or zoomed

            google.maps.event.addListener(map, 'click', function() {
                $('.contextmenu').remove();
            });

            google.maps.event.addListener(map, 'dragstart', function() {
                $('.contextmenu').remove();
            });

            google.maps.event.addListener(map, 'zoom_changed', function() {
                $('.contextmenu').remove();
            });

            function showContextMenu(currentLatLng) {
                var projection;
                var contextmenuDir;
                var latLng = "'" + currentLatLng + "'";
                projection = map.getProjection() ;
                $('.contextmenu').remove();
                contextmenuDir = document.createElement("div");
                contextmenuDir.className  = 'contextmenu';
                var string = '<ul class="add-menu"><li ng-click="addUnit(' + latLng + ')">Add Organisation Unit</li></ul>';
                contextmenuDir.appendChild($compile(string)($scope)[0]);
                $(map.getDiv()).append(contextmenuDir);

                setMenuXY(currentLatLng);

                contextmenuDir.style.visibility = "visible";
            }



            function getCanvasXY(currentLatLng){
                var scale = Math.pow(2, map.getZoom());
                var nw = new google.maps.LatLng(
                    map.getBounds().getNorthEast().lat(),
                    map.getBounds().getSouthWest().lng()
                );
                var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
                var worldCoordinate = map.getProjection().fromLatLngToPoint(currentLatLng);
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

            google.maps.event.trigger(map, "resize");


            //Add Unit
            $scope.addUnit = function(latlng) {
                $scope.latlng = latlng.replace(/[^0-9\-.,]+/g,"").split(',');
                googleMaps.checkCountry().get({lat: $scope.latlng[0], long: $scope.latlng[1]}).$promise.then(function(data) {
                    if (data.results.length)
                    {
                        for (var i = 0; i < data.results[0].address_components.length; i++) {
                            for (var x = 0; x < data.results[0].address_components[i].types.length; x++) {
                                if (data.results[0].address_components[i].types[x] === 'country') {
                                    $scope.countryCode = data.results[0].address_components[i].short_name;
                                }
                            }
                        }
                        if ($scope.countryCode === 'SL') {

                            $scope.newMarker = new google.maps.Marker({
                                map: map,
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
                    }
                    else {
                        alert('Please add only in Sierra Leone');
                        $('.contextmenu').remove();
                    }
                });

            };

            //select Unit and create either marker or polygon
            $scope.unitSelected = function(selected) {
                if (selected) {
                    for (var i = 0; i < $scope.allUnits.length; i++) {
                        //check if titles are the same to show the result
                        if ($scope.allUnits[i].name === selected.title) {
                            if ($scope.allUnits[i].featureType === 'POINT') {
                                createMarker($scope.allUnits[i], false);
                            }
                            else if ($scope.allUnits[i].featureType === 'POLYGON' || $scope.allUnits[i].featureType === 'MULTI_POLYGON') {
                                if (polygon)
                                    polygon.setMap(null);

                                createPolygon($scope.allUnits[i], false);
                            }
                        }
                    }
                }
            }
            //show all Facilities
            $scope.allFacilities = function() {
                $scope.clicked = !$scope.clicked;
                if ($scope.clicked) {
                    if (!$scope.mc){
                        for (var i = 0; i < $scope.allUnits.length; i++) {
                            if ($scope.allUnits[i].levelName === 'Facility') {
                                createMarker($scope.allUnits[i], true);
                            }
                        }
                        $scope.mc = new MarkerClusterer(map, markers, {
                            maxZoom: 14
                        });
                    }
                    else {
                        $scope.mc.addMarkers(markers);
                    }
                }
                else {
                    if (markers.length > 0) {
                        $scope.mc.removeMarkers(markers);
                    }
                }
            }

            //Show all Chiefdoms
            $scope.allChiefdoms = function() {
                $scope.cclicked = !$scope.cclicked;
                if ($scope.cclicked) {
                    if (polygon)
                        polygon.setMap(null);
                    for (var i = 0; i < $scope.allUnits.length; i++) {
                        if ($scope.allUnits[i].levelName === 'Chiefdom') {
                            createPolygon($scope.allUnits[i], true);
                        }
                    }
                }
                else
                {
                    for (var i = 0; i < polygons.length; i ++) {
                        if (polygons[i].level_name === 'Chiefdom')
                            polygons[i].setMap(null);
                    }
                    polygon.length = 0;
                }
            }

            //Show all Districts
            $scope.allDistricts = function() {
                $scope.dclicked = !$scope.dclicked;
                if ($scope.dclicked) {
                    for (var i = 0; i < $scope.allUnits.length; i++) {
                        if ($scope.allUnits[i].levelName === 'District') {
                            createPolygon($scope.allUnits[i], true);
                        }
                    }
                }
                else
                {
                    for (var i = 0; i < polygons.length; i ++) {
                        if (polygons[i].level_name === 'District')
                            polygons[i].setMap(null);
                    }
                    polygon.length = 0;

                }

            }

            //watch for updates
            $scope.$watch(function() {
                return changeUnits.update();
            }, function(newVal, oldVal) {
                if (newVal.length > 0){
                    $scope.allUnits = newVal;
                    $scope.searchUnits = $scope.allUnits;
                    $rootScope.$broadcast('search-change', $scope.searchUnits);
                    for (var i = 0; i < $scope.allUnits.length; i++) {
                        if (infoWindow.id == $scope.allUnits[i].id) {
                            if ($scope.allUnits[i].featureType == 'POINT')
                                createInfoWindow($scope.allUnits[i], 'marker');
                            else
                                createInfoWindow($scope.allUnits[i], 'polygon');
                        }
                    }

                }
            }, true);


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
            var units, edittedUnit;
            $scope.updateUnit = function(unit) {
                //copy the unit in other object
                edittedUnit = angular.copy(unit);
                units = SharedVariables;
                $scope.editUnit.$update(function() {}).then(function(success) {
                    if (success.httpStatusCode == 200) {
                        for (var i = 0; i < units.length; i ++)
                        {
                            if (units[i].id == id) {
                                if (edittedUnit.name) {
                                    units[i].name = edittedUnit.name;
                                    units[i].displayName = edittedUnit.name;
                                }

                                if (edittedUnit.shortName)
                                    units[i].shortName = edittedUnit.shortName;
                                if (edittedUnit.openingDate)
                                    units[i].openingDate = $filter('date')(edittedUnit.openingDate, 'M/d/yyyy');
                            }
                        }

                        //send to factory to watch
                        changeUnits.set(units);
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

        .controller('AddUnitController', function($scope, SharedVariables, $uibModalInstance, marker, changeUnits, orgUnits) {  //Add addUnits?

            var allUnits, position, addedID;

           //Shared variable, defined in .factory.
            allUnits = SharedVariables;
           $scope.allLevel3Units = [];
            //Fetch all parents (level 3 units) from the shared array and save to $scope.allLevel3Units
            for (var i = 0; i < allUnits.length; i++) {
                if (allUnits[i].level == 3) {
                    $scope.allLevel3Units.push(allUnits[i]);
                }
            }

            //Initialise dropdown list with item in index 0
            $scope.selectedParent = $scope.allLevel3Units[0];

            //Get the coordinates of the selected marker
            position = marker.getPosition();

            $scope.lat = position.lat();
            $scope.lng = position.lng();

            //Assign parent and coordinates to the given facility
            $scope.addFacility = {
                parent:{"id": $scope.selectedParent.id, "name": $scope.selectedParent.name},
                featureType:"POINT",
                coordinates:"[" + $scope.lng+ "," + $scope.lat + "]"
            };


            //Change parent according to the dropdown list
            $scope.changedValue=function(item){
                $scope.addFacility.parent.name=item.name;
                $scope.addFacility.parent.id=item.id;
            };


            // Add a new unit
            $scope.addUnit = function() {
                orgUnits.createUnit().save($scope.addFacility, function(addedObject) {

                        // This is the ID of the recently added object

                        addedID = addedObject.response.lastImported;
                        // In order to update the browser in real-time, one has to first fetch the unit from the DB, and then push it to 
                        // the temporary array of all units. After it has been pushed, the main array has to be updated with the temporary one.

                        orgUnits.orgUnit().get({id: addedID}).$promise.then(function(fetchedFacility) {

                        fetchedFacility['levelName'] = 'Facility';
                         // Push the fetched unit to the temporary array of units

                         allUnits.push(fetchedFacility);

                         // Propogate the update of the main array       
                         changeUnits.set(allUnits);
                        $('.contextmenu').remove();
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
                $('.contextmenu').remove();
                $uibModalInstance.dismiss('cancel');
                marker.setMap(null);
            }
        });
})();