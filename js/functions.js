(function () {
    var app = angular.module('lymap', ['ngResource', 'angucomplete-alt']);

    app
        .factory('orgUnits', function($http, $resource) {
            return {
                //get All OrganisationUnits
                getOrgUnits: function(callback) {
                    $http.get('http://localhost:8080/api/organisationUnits.json?paging=false&links=false').success(callback);
                },
                //Get/Update/Delete OrganisationUnits by their ID
                getOrgUnit: function() {
                    return $resource('http://localhost:8080/api/organisationUnits/:id', {id: '@id'}, {
                        method: 'GET',
                        isArray: true
                    });
                }
        };

    })
        .controller('mapController', function($scope, $http, $location, orgUnits, $q) {

        //Set map options
        $scope.mapOptions = {
            zoom: 4,
            center: new google.maps.LatLng(9.0131, -12.9487),
            mapTypeId: google.maps.MapTypeId.TERRAIN
        };

        $scope.map = new google.maps.Map(document.getElementById('map'), $scope.mapOptions);

        $scope.markers = [];

        $scope.infoWindow = new google.maps.InfoWindow();

        $scope.createMarker = function (info) {
            //Get the coordinates and create an array
            $scope.coords = info.coordinates.replace(/[^0-9\-.,]+/g,"").split(',');

            //Create marker
            $scope.marker = new google.maps.Marker({
                map: $scope.map,
                position: new google.maps.LatLng($scope.coords[1], $scope.coords[0]),
                title: info.name
            });

            //InfoWIndow Content
            $scope.marker.content = '<div class="infoWindowContent">' + info.displayName + '</div>';

            //click event with info window
            google.maps.event.addListener($scope.marker, 'click', function(){
                $scope.infoWindow.setContent('<h2>' + this.title + '</h2>' + this.content);
                $scope.infoWindow.open($scope.map, this);
            });

            $scope.markers.push($scope.marker);
        };




          $scope.Units = orgUnits.getOrgUnits(function(data) {
                $scope.orgUnits = data;
                $scope.orgUnitId = [];
                for (var i = 0; i < $scope.orgUnits.organisationUnits.length; i++) {
                    //Iterate and get each unit one by one
                    $scope.orgUnitId.push(orgUnits.getOrgUnit().get({id: $scope.orgUnits.organisationUnits[i].id}).$promise);
                }
                $scope.allUnits = [];
                    //Wait until the data is fetched from the db
                $q.all($scope.orgUnitId).then(function(units) {
                    for (var x = 0; x < units.length; x++) {
                        if (!angular.isUndefined(units[x].coordinates)) {
                            //create new Array with OrganisationUnits with present coordinates
                            $scope.createMarker(units[x]);
                            $scope.allUnits.push(units[x]);
                        }
                    }

                    //Create Clusters
                    $scope.mc = new MarkerClusterer($scope.map, $scope.markers, {
                        maxZoom: 18
                    });
                    var loader = document.getElementById('loader'),
                        map_wrapper = document.getElementById('map-wrapper');
                    loader.className = "hide";
                    map_wrapper.className = "show";
                    google.maps.event.trigger($scope.map, "resize");

                    //autocompleter select unit and zoom/openInfoWindow
                    $scope.unitSelected = function(selected) {
                        if (selected) {
                            for (var i = 0; i < $scope.markers.length; i++) {
                                if ($scope.markers[i].title === selected.title) {
                                    google.maps.event.trigger($scope.markers[i], 'click');
                                    $scope.map.setZoom(16);
                                }
                            }
                        }
                    }
                })
            });
    });
})();