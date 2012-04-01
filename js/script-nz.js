/* Author: 

*/
var dataSources = {
	'sources': [],
	'listSeries': function(type) {
			var series = [];
			$.each(this.sources, function(index, source) {
				series.push({'name': source.name, 'data': source.makeSeries(type)});
			});
			return series;
		}
}
function graphData() {
	this.label = '';
	this.query = '';
        this.api_query = '';
	this.data = {};
        this.interval = '';
	this.getYears = function() {
		var years = [];
		$.each(this.data, function(year, value) {
			years.push(year);
		});
		years.sort();
		return years;
	}
	this.makeSeries = function(type) {
		//years = this.getYears();
		var series = [];
		//var self = this;
                if (this.interval == "year") {
                    $.each(this.data, function(year, values) {
                        series.push([Date.UTC(parseInt(year, 10), 0, 1), values[type]]);
                    });
                } else if (this.interval == "month") {
                    $.each(this.data, function(year, values) {
                        $.each(values, function(month, totals) {
                            series.push([Date.UTC(parseInt(year, 10), parseInt(month, 10)-1, 1), totals[type]]);
                        });       
                    });
                }
		//$.each(years, function(index, year) {
		//	series.push([parseInt(year), self.data[year][type]]);
		//});
		return series;
	}
	this.getTotal = function(year, month) {
	    if (month > 0) {
		return this.data[year.toString()][month.toString()]['total'];
            } else {
                return this.data[year.toString()]['total'];
            }
	}
        this.getRatio = function(year, month) {
	    if (month > 0) {
		return this.data[year.toString()][month.toString()]['ratio'];
            } else {
                return this.data[year.toString()]['ratio'];
            }
	}
}
$(function(){
    reset();
    var api_key = "9yXNTynMDb3TUQws7QuD";
    var api_url = "http://api.digitalnz.org/records/v2.json?";
    var html_url = "http://digitalnz.org.nz/records?i[display_collection]=Papers+Past";
    var twitter_url ="//platform.twitter.com/widgets/tweet_button.html";
    var query = "";
    queries = [];
    var query_type = 'ratio';
    function get_query() {
        if ($("#query").val() != "") {
            queries.push(encodeURIComponent($("#query").val()));
        } else if (window.location.href.match(/\?q=.+/)) {
            queries = window.location.href.split(/\?q=|&q=/);
            queries.shift();
        }
        do_query();
    }
    function api_request(query) {
        $.ajax({
            "dataType": "jsonp",
            "jsonp": "jsonp",
            "url": api_url + query + "&facets=year&facet_num_results=-1&num_results=0&api_key=" + api_key,
            "success": function(results) {
                process_results(results);
            },
            "error": function(d,msg) {
                alert("Error: " + msg);
            }
        });
   }
   
   function process_results(results) {
        if (query_type == "total") {
            $.each(results.facets[0].values, function(index, value) {
                current_year = parseInt(value.name, 10);
                current_series.data[current_year]['total'] = value.num_results;
                var ratio = value.num_results / current_series.data[current_year]['all'];
                current_series.data[current_year]['ratio'] = ratio;
            });
            query_type = "ratio";
            dataSources.sources.push(current_series);
            do_query();
        } else if (query_type == "ratio") {
            $.each(results.facets[0].values, function(index, value) {
                current_year = parseInt(value.name, 10);
                current_series.data[current_year] = {};
                var ratio = current_series.data[current_year]['total'] / value.num_results;
                current_series.data[current_year]['all'] = value.num_results;
                current_series.data[current_year]['total'] = 0;
                current_series.data[current_year]['ratio'] = 0;
            });
            query_type = "total";
            api_request(query);
        }
   }
   function do_query() {
        if (queries.length > 0) {
            keywords = queries.shift()
            query = "&search_text=" + keywords + '+collection:"Papers+Past"';
            current_series = new graphData();
            current_series.name = decodeURIComponent(keywords);
            current_series.api_query = query;
            current_series.interval = "year";
            api_request('&search_text=collection:"Papers+Past"');
        } else if (dataSources.sources.length > 0) {
            makeChart('ratio');
            $('#clear_last').show();
            if (dataSources.sources.length > 1) {
                $('#clear_all').show();
            }
        }
   }
   function make_link() {
        var params = [];
        $.each(dataSources.sources, function(key, source) {
            params.push(encodeURIComponent(source.name));
        });
        var link = "http://wraggelabs.com/shed/querypicnz/?q=" + params.join("&q=");
        return link;
   }
   function serialise_data() {
        series_name = "series" + series_data.length;
        $("#series_data").append("var" + series_name + " = new graphData();");
        $("#series_data").append(series_name + ".name = '" + current_series.name + "';");
        $("#series_data").append("series_data.push(" + series_name + ");");
   }
    var chart;

    function makeChart(type) {
        $("#intro").hide();
        $("#hints").show();
        $("#trove-results").show();
        $("#graph").show();
        $("#type_selector").show();
        $('#graph_type').val(type);
        $("#query").val("");
        var link = make_link();
        $("#link").html("Share this: <a href='" + link + "'>" + link + "</a>");
        $("#twitter-frame").attr('src', twitter_url + "?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent("Made with QueryPicNZ") + "&hashtags=querypic");
        if (dataSources.sources[0].interval == "month") {
            x_date = "%b %Y";
            xLabel = "Month";
        } else {
            x_date = "%Y";
            xLabel = "Year";
        }
        if (type == "total") {
            yLabel = "Number of articles matching query";
        } else if (type == "ratio") {
            yLabel = "% of articles matching query"
        }
        chart = new Highcharts.Chart({
          chart: {
             renderTo: 'graph',
             type: 'spline',
             zoomType: 'x'
          },
          title: {
              text: 'New Zealand newspaper articles by date'
           },
           xAxis: {
                    title: {
                            text: xLabel
                    },
                    type: 'datetime',
                    labels: {
                        formatter: function() {
                            return Highcharts.dateFormat(x_date, this.value);
                        }
                    }
           },
           yAxis: {
              title: {
                    text: yLabel
                },
                labels: {
                    formatter: function() {
                        if (type == "ratio") {
                            return Highcharts.numberFormat(this.value * 100, 2, '.', '');
                        } else if (type == 'total') {
                            return this.value;
                        }
                    }
                },
              min: 0
           },
           tooltip: {
              formatter: function() {
                    year = new Date(this.x).getFullYear();
                    if (dataSources.sources[this.series.index].interval == "month") {
                        var interval = "month";
                        month = new Date(this.x).getMonth() + 1;
                        month_name = Highcharts.dateFormat("%b %Y", this.x);
                    } else {
                        var interval = "year;"
                        month = 0;
                    }
                    if (type == "total") {
                        displayValue = this.y + " articles (" + (dataSources.sources[this.series.index].getRatio(year, month) * 100).toPrecision(2) + "% )";
                    } else if (type == "ratio") {
                        displayValue = (this.y * 100).toPrecision(2) + "% (" + dataSources.sources[this.series.index].getTotal(year, month) + " articles)";
                    }
                    if (interval == "month") {
                        return '<b>'+ this.series.name +'</b><br/>'+ month_name + ': ' + displayValue;
                    } else {
                        return '<b>'+ this.series.name + '</b><br/>' + year +': ' + displayValue;
    
                    }
             }
           },
          series: dataSources.listSeries(type),
          plotOptions: {
               series: {
                  cursor: 'pointer',
                  point: {
                     events: {
                        click: function() {
                            date = new Date(this.x);
                            query_date = date.getFullYear();
                            if (dataSources.sources[this.series.index].interval == "month") {
                                month = date.getMonth() + 1;
                                if (month < 10) {
                                    query_date = query_date + "/0" + month;
                                } else {
                                    query_date = query_date + "/" + month;
                                }
                            }
                            showArticles(query_date, this.series);
                        }
                     }
                  }
               }
            }
        });
    }
    function showArticles(query_date, series) {
            $('#articles').empty().height('50px');           
            $('#articles').showLoading();
            $.ajax({
                    dataType: 'jsonp',
                    "jsonp": "jsonp",
                    url: api_url + dataSources.sources[series.index].api_query + "+year:" + query_date + "&api_key=" + api_key,
                    success: function(results) {
                            $('#articles').height('');
                            $('#articles').append('<h3>Articles from Papers Past</h3>');
                            if (results.results.length > 0) {
                                    var articles = $('<ul id="articles"></ul>');
                                    $.each(results.results, function(key, article) {
                                            articles.append('<li><a target="_blank" class="article" href="'+ article.display_url + '">' + article.title + '</a></li>');
                                    });
                                    $('#articles').append(articles);
                            } else if (results.error == "An error occurred: ApplicationError: 5 ") {
                                    $('#articles').append('<p>Sorry, Trove took too long to respond. Use the link below to query Trove directly.<p>');
                            }
                            $('#articles').append('<div class="more"><p><a target="_blank" href="' + html_url + '&i[year]=%5B' + query_date + '+TO+' + query_date + '%5D&text=' + encodeURI(keywords) + '">&gt; View more at DigitalNZ</a></p></div>')
                            $('#articles').hideLoading();
                    }
            });
    }
    function clear_last() {
        dataSources.sources.pop();
        if (dataSources.sources.length > 0) {
            makeChart($('#graph_type').val());
            if (dataSources.sources.length == 1) {
                $("#clear_all").hide();
            }
        } else {
            chart.destroy();
            reset();
        }   
        
    }
    function clear_all() {
        dataSources.sources = [];
        chart.destroy();
        reset();
    }
    function reset() {
        $("#clear_last").hide();
        $("#clear_all").hide();
        $("#type_selector").hide();
        $("#trove-results").hide();
        $("#graph").hide();
        $("#hints").hide();
        $("#intro").show();
        $("#articles").empty();
    }
    $('#graph_type').change(function() {
       makeChart($('#graph_type').val()); 
    });
    $("#do_query").button().click(function(){ get_query(); });
    $('#query').keydown(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            get_query();
        }
    });
    $("#clear_last").button().click(function(){ clear_last(); });
    $("#clear_all").button().click(function(){ clear_all(); });
    get_query();
});






















