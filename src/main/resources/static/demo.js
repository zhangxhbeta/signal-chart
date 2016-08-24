/**
 * 往文档里面的 #chart 里面塞一张堆积图
 * 
 * @author zhangxh
 */
$(function () {
  var boxHeight = 480;

  // 开始部分，准备svg画布
  var boxWidth, box = d3.select("#chart").node().getBoundingClientRect();
  if (!box.width) {
    boxWidth = box.width;
  } else {
    boxWidth = box.right - box.left;
  }
  var svg = d3.select('#chart').append('svg').attr('width', boxWidth).attr('height', boxHeight).style('display', 'block');
  d3.select('#version').html('v' + d3.version + ' chart size: ' + boxWidth + 'x' + boxHeight);

  // 获取大小，高度固定／宽度自适应100%
  var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 50
  };

  // svg 画布已准备妥当，开始准备图表元素
  var height = boxHeight - margin.bottom - margin.top,
      width = boxWidth - margin.left - margin.right;
  var parseDate = d3.time.format("%d-%b-%y").parse;
  var x = d3.time.scale().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);
  var xAxis = d3.svg.axis().scale(x).orient("bottom");
  var yAxis = d3.svg.axis().scale(y).orient("left");

  var area = d3.svg.area().x(function(d) {
    return x(d.date);
  }).y0(height).y1(function(d) {
    return y(d.close);
  });

  var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.tsv("data-area.tsv", function(error, data) {
    data.forEach(function(d) {
      d.date = parseDate(d.date);
      d.close = +d.close;
    });

    x.domain(d3.extent(data, function(d) {
      return d.date;
    }));
    y.domain([0, d3.max(data, function(d) {
      return d.close;
    })]);

    g.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);

    g.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    g.append("g")
        .attr("class", "y axis")
        .call(yAxis).append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("价格 (¥)");
  });
});