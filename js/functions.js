(function () {
    var app = angular.module('lymap', ['ngResource', 'angucomplete-alt', 'ngAnimate', 'ui.bootstrap']);

    app
        .factory('orgUnits', function($http, $resource) {
            return {
                //get All OrganisationUnits
                getOrgUnits: function(callback) {
                    $http.get('http://localhost:8080/api/organisationUnits.json?paging=false&links=false').success(callback);
                },
                //Get/Update/Delete OrganisationUnits by their ID
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
            return $resource('http://localhost:8082/api/organisationUnits', {}, {
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

        .controller('mapController', function($scope, $http, $location, orgUnits,orgUnitss, $q, $window, $uibModal, $compile, googleMaps) {

        $scope.loader = document.getElementById('loader');

        //Set map options
        $scope.mapOptions = {
            zoom: 8,
            center: new google.maps.LatLng(9.0131, -12.9487),
            mapTypeId: google.maps.MapTypeId.TERRAIN
        };

        $scope.map = new google.maps.Map(document.getElementById('map'), $scope.mapOptions);

        $scope.markers = [];

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
                title: info.name
            });

            var id = "'" + info.id + "'";

            var string = '<div class="infoWindowContent">' +
                '<p> Opening Date: ' + info.openingDate + '</p>' +
                '<p> Level: ' + info.levelName + '</p>' +
                '<p> Display name: ' + info.displayName + '</p>' +
                '<p> Short name: ' + info.shortName + '</p>' +
                '<div class="infoWindowContent"><button type="button" class="btn btn-default" ng-click="open(' + id + ')">Edit</button>' +
                '</div>';

            var $btn = $compile(string)($scope);

            //click event with info window
            if (flag)
            {
                google.maps.event.addListener($scope.marker, 'click', function(){
                    $scope.infoWindow.setContent($btn[0]);
                    $scope.infoWindow.open($scope.map, this);
                });

                $scope.markers.push($scope.marker);
            }
            else
            {
                $scope.infoWindow.setContent($btn[0]);
                $scope.infoWindow.open($scope.map, $scope.marker);

                $scope.map.setZoom(14);
                $scope.map.setCenter($scope.marker.getPosition());
            }



        };

            $scope.polygons = [];

            $scope.createPolygon = function(info, flag) {

                $scope.newPolName = name;

                if ($scope.polygon && flag == false) {
                    $scope.polygon.setMap(null);
                }

                if ($scope.marker) {
                    $scope.marker.setMap(null);
                }


                //console.log(info.coordinates);
                $scope.coordInfo = [];
                $scope.bounds = new google.maps.LatLngBounds();
                //Get the coordinates and create an array
                $scope.coords = info.coordinates.replace(/[^0-9\-.,]+/g,"").split(',');
                for (var i = 0; i < $scope.coords.length; i++) {
                    if ( i % 2 == 0) {
                        $scope.coordInfo.push({lat: parseFloat($scope.coords[i + 1]), lng: parseFloat($scope.coords[i])});
                    }
                }

                var id = "'" + info.id + "'";

                var string = '<div class="infoWindowContent">' +
                    '<p> Opening Date: ' + info.openingDate + '</p>' +
                    '<p> Level: ' + info.levelName + '</p>' +
                    '<p> Display name: ' + info.displayName + '</p>' +
                    '<p> Short name: ' + info.shortName + '</p>' +
                    '<div class="infoWindowContent"><button type="button" class="btn btn-default" ng-click="open(' + id + ')">Edit</button>' +
                    '</div>';

                var $btn = $compile(string)($scope);
                //console.log($scope.coordInfo);
                $scope.polygon = new google.maps.Polygon({
                    paths: $scope.coordInfo,
                    strokeColor: '#FF0000',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#FF0000',
                    fillOpacity: 0.35
                });

                //for (var x = 0; x < $scope.coordInfo.length; x++) {
                //    $scope.bounds.extend($scope.coordInfo[x]);
                //}
                //console.log(polygon);
                $scope.polygon.setMap($scope.map);
                $scope.polygon['level_name'] = info.levelName;

                $scope.map.setZoom(8);
                $scope.map.setCenter({lat: $scope.coordInfo[0].lat, lng: $scope.coordInfo[0].lng});

                $scope.polygon.addListener('click', function(e) {
                    $scope.infoWindow.setContent($btn[0]);
                    $scope.infoWindow.setPosition(e.latLng);
                    $scope.infoWindow.open($scope.map);
                });

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

                $scope.allUnits = [];
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
                            //Do we really need this if statement? This causes alot of facilites without featureType and coordinates to be left out from the search
                            for (var x = 0; x < units.length; x++) {
                                if (!angular.isUndefined(units[x].coordinates) && units[x].featureType !== 'NONE')
                                {
                                    for (var i = 0; i < $scope.allLevels.length; i ++) {

                                        if ($scope.allLevels[i].level === units[x].level) {
                                            units[x]['levelName'] = $scope.allLevels[i].name;
                                        }
                                    }
                                    $scope.allUnits.push(units[x]);
                                    $scope.searchUnits = $scope.allUnits;
                                }
                            }

                            $scope.unitSelected = function(selected) {
                                if (selected) {
                                    for (var i = 0; i < $scope.allUnits.length; i++) {
                                        if ($scope.allUnits[i].name === selected.title) {
                                            if ($scope.allUnits[i].featureType === 'POINT') {

                                                $scope.createMarker($scope.allUnits[i], false);
                                            }
                                            else if ($scope.allUnits[i].featureType === 'POLYGON' || $scope.allUnits[i].featureType === 'MULTI_POLYGON') {
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
                                        $scope.map.setCenter({ lat: 9.0131, lng:  -12.9487 });
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
                                    for (var i = 0; i < $scope.allUnits.length; i++) {
                                        if ($scope.allUnits[i].levelName === 'Chiefdom') {
                                            $scope.createPolygon($scope.allUnits[i], true, 'Chiefdom');
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

                        if((mapWidth - x ) < menuWidth)//if to close to the map border, decrease x position
                            x = x - menuWidth;
                        if((mapHeight - y ) < menuHeight)//if to close to the map border, decrease y position
                            y = y - menuHeight;

                        $('.contextmenu').css('left',x  );
                        $('.contextmenu').css('top',y );
                    };



                    //Create Clusters
                    //$scope.mc = new MarkerClusterer($scope.map, $scope.markers, {
                    //    maxZoom: 18
                    //});
                    //var loader = document.getElementById('loader'),
                    //    map_wrapper = document.getElementById('map-wrapper');
                    //loader.className = "hide";
                    //map_wrapper.className = "show";
                    google.maps.event.trigger($scope.map, "resize");

                    //autocompleter select unit and zoom/openInfoWindow

                })
        });



        

        /**************** Find Me button geolocation - Chak ongoing *******************/
/*        $scope.currentLocation = "Current Location";
        $scope.supportsGeo = $window.navigator;
        $scope.position = null;
        $scope.waitForPositionMessage = "";

        $scope.getCurrentLocation = function() {
            $scope.waitForPositionMessage = "Getting position, will plot to map when ready!";
            window.navigator.geolocation.getCurrentPosition(function(position) {
                $scope.$apply(function() {
                    $scope.position = position;
                    //console.log($scope.position);
                    //console.log($scope.position.coords.latitude);
                    //console.log($scope.position.coords.longitude);

                    $scope.$watch($scope.position, function() {

                        //Create marker
                        m = new google.maps.Marker({
                        map: $scope.map,
                        position: new google.maps.LatLng($scope.position.coords.latitude,$scope.position.coords.longitude),
                        title: $scope.currentLocation
                        });
                        $scope.waitForPositionMessage = "";
                    });

                });
            }, function(error) {
                $scope.waitForPositionMessage = "";
                alert(error);
            });
        };  */


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
    
        .controller('EditUnitController', function($scope, $uibModalInstance, id, orgUnits, $q) {
            $scope.updateUnit = function() {
                $scope.editUnit.$update();
                $uibModalInstance.dismiss('cancel');
            };

            //TODO reusable part
            //$scope.Levels = orgUnits.getLevels(function(data) {
            //    $scope.levels = [];
            //
            //    for (var i = 0; i < data.organisationUnitLevels.length; i++) {
            //        $scope.levels.push(orgUnits.getLevel().get({id: data.organisationUnitLevels[i].id}).$promise);
            //    }
            //
            //    $scope.allLevels = [];
            //    $q.all($scope.levels).then(function(levels) {
            //        for (var i = 0; i < levels.length; i++) {
            //            $scope.allLevels.push(levels[i]);
            //        }
            //        orgUnits.orgUnit().get({id: id}).$promise.then(function(result) {
            //            $scope.editUnit = result;
            //            $scope.editUnit.openingDate = new Date($scope.editUnit.openingDate);
            //            //TODO fix this part... apply current selected
            //            $scope.editUnit.level = $scope.allLevels[1];
            //        });
            //    });
            //});

        orgUnits.orgUnit().get({id: id}).$promise.then(function(result) {
            $scope.editUnit = result;
            $scope.editUnit.openingDate = new Date($scope.editUnit.openingDate);
        });


        $scope.cancel = function() {
            $uibModalInstance.dismiss('cancel');
        }
    })




        // Controller for adding new facilities
        .controller('AddUnitController', function($scope, $uibModalInstance, marker, orgUnitss) {

            //Some random testing properties, the parent ID and name have to exist!
            $scope.addFacility = {
                featureType:"POINT",
                parent:{"id":"ScjatY1Bd3G", "name": "Badjia"},
                coordinates:"[" + "41.40338"+ "," + "2.17403" + "]"
            }

            $scope.addUnit = function() {
                orgUnitss.create( $scope.addFacility).$promise.then(
                //success
                function( value ){
                    alert("Create success");
                    $scope.addFacility=[];
                },
                //error
                function( error ){
                    alert("Create failed");}
                );
                $uibModalInstance.dismiss('cancel');
            };

            //TODO: Fix references to different parents.
            //name,shortName, openingDate are mandatory, also make openingDate have to autofill with format YY-MM-DD
            //Traditional way of POSTING data
            //$scope.addUnit = function(orgUnitData) {
            //
            //    var postData = {
            //        "name" : orgUnitData.nname,
            //        "shortName" : orgUnitData.shortName,
            //        "level" : "4",
            //        "parent": {"id":"YuQRtpLP10I", "name": "Badjia"},
            //        //"description" : orgUnitData.ddescription,
            //        //"code" : orgUnitData.ccode,
            //        "openingDate" : "2015-12-04",
            //        //"comment" : orgUnitData.comment,
            //        "coordinates" : "[" + "41.40338"+ "," + "2.17403" + "]",
            //        //"longitude" : orgUnitData.longitude,
            //       //"latitude" : orgUnitData.latitude,
            //        //"url" : orgUnitData.url,
            //        //"contactPerson" : orgUnitData.contactPerson,
            //        //"address" : orgUnitData.address,
            //        //"email" : orgUnitData.email,
            //        //"phoneNumber" : orgUnitData.phoneNumber
            //        //"featureType" : "NONE | POINT"
            //    };

            //close modals if clicked somewhere or cancelled
            $uibModalInstance.result.then(function(){}, function() {
                marker.setMap(null);
            });

            $scope.cancel = function() {
                $uibModalInstance.dismiss('cancel');
                marker.setMap(null);
            }
        })
    ;
})();