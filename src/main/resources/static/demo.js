/**
 * 往文档里面的 #chart 里面塞一张堆积图
 * 
 * @author zhangxh
 */
$(function () {

  // 首先计算一下高度宽度
  var aspectRatio = 3; // 图表高度宽度比例 1:3
  var minDetailHeight = 30; // 详情区域最小高度 30px
  var smallDevicesWidth = 767; // 小屏幕宽度, 超出认定为其他大小

  // 获取当前 chart 可用宽度, 然后根据比例算出可用高度
  var boxWidth, box = d3.select("#chart").node().getBoundingClientRect();
  if (!box.width) {
    boxWidth = box.width;
  } else {
    boxWidth = box.right - box.left;
  }
  var boxHeight = boxWidth / aspectRatio;

  // 根据窗口高度布局一次详情表格高度, 然后绑定 resiz 事件处理
  // 这里做了响应式, 如果是手机屏幕就不做自适应了
  if ($(window).innerWidth() > 767) {
    layout();
    $( window ).resize(function() {
      layout();
    });
  }

  // 开始部分，准备svg画布
  var svg = d3.select('#chart').append('svg')
      .attr('width', '100%')
      .attr('height', 'auto')
      .attr('viewBox', '0 0 ' + boxWidth + " " + boxHeight)
      .attr('preserveAspectRatio', 'xMid yMid none')
      .style('display', 'block');
  d3.select('#version').html('v' + d3.version);

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

  // 详情部分布局
  function layout() {
    // 工具栏固定, 图表高度固定, 底栏footer高度固定, 剩余的就是信息详情的高度
    var availableHeight = $(window).innerHeight() - $('#toolbar').outerHeight() - boxHeight - $('#footer').outerHeight();
    availableHeight = availableHeight > minDetailHeight ? availableHeight : minDetailHeight;
    $('#detail').outerHeight(availableHeight);
  }
});