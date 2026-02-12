    // Revenue Trend Chart (Line Chart)
    var revenueCtx = document.getElementById("revenue-trend-chart");
    if (revenueCtx) {
      var revenueGradient = revenueCtx.getContext("2d").createLinearGradient(0, 230, 0, 50);
      revenueGradient.addColorStop(1, 'rgba(17, 205, 239, 0.2)');
      revenueGradient.addColorStop(0.2, 'rgba(72, 72, 176, 0.0)');
      revenueGradient.addColorStop(0, 'rgba(17, 205, 239, 0)');

      new Chart(revenueCtx, {
        type: "line",
        data: {
          labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          datasets: [{
            label: "Revenue",
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: "#11CDEF",
            pointBorderColor: "#fff",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "#11CDEF",
            pointHoverBorderColor: "#fff",
            pointHoverBorderWidth: 2,
            borderColor: "#11CDEF",
            backgroundColor: revenueGradient,
            fill: true,
            data: [12500, 14200, 13800, 16800, 19200, 21500],
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12,
                  family: "Open Sans",
                  weight: 'normal'
                },
                color: '#67748e'
              }
            },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#67748e',
              bodyColor: '#67748e',
              borderColor: '#e9ecef',
              borderWidth: 1,
              padding: 12,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  return '$' + context.parsed.y.toLocaleString();
                }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index',
          },
          scales: {
            y: {
              grid: {
                drawBorder: false,
                display: true,
                drawOnChartArea: true,
                drawTicks: false,
                borderDash: [5, 5],
                color: '#e9ecef'
              },
              ticks: {
                display: true,
                padding: 10,
                color: '#b2b9bf',
                font: {
                  size: 11,
                  family: "Open Sans",
                  style: 'normal',
                  lineHeight: 2
                },
                callback: function(value) {
                  return '$' + (value / 1000).toFixed(1) + 'k';
                }
              }
            },
            x: {
              grid: {
                drawBorder: false,
                display: false,
                drawOnChartArea: false,
                drawTicks: false,
                borderDash: [5, 5]
              },
              ticks: {
                display: true,
                color: '#b2b9bf',
                padding: 20,
                font: {
                  size: 11,
                  family: "Open Sans",
                  style: 'normal',
                  lineHeight: 2
                }
              }
            }
          }
        }
      });
    }

    // Order Status Distribution Chart (Doughnut Chart)
    var orderStatusCtx = document.getElementById("order-status-chart");
    if (orderStatusCtx) {
      new Chart(orderStatusCtx, {
        type: "doughnut",
        data: {
          labels: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
          datasets: [{
            label: "Orders",
            weight: 9,
            cutout: 60,
            tension: 0.9,
            pointRadius: 2,
            borderWidth: 2,
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(255, 206, 86, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            data: [18, 42, 28, 156, 4]
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: {
                usePointStyle: true,
                padding: 15,
                font: {
                  size: 12,
                  family: "Open Sans",
                  weight: 'normal'
                },
                color: '#67748e'
              }
            },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#67748e',
              bodyColor: '#67748e',
              borderColor: '#e9ecef',
              borderWidth: 1,
              padding: 12,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  var label = context.label || '';
                  var value = context.parsed || 0;
                  var total = context.dataset.data.reduce((a, b) => a + b, 0);
                  var percentage = ((value / total) * 100).toFixed(1);
                  return label + ': ' + value + ' (' + percentage + '%)';
                }
              }
            }
          },
          cutout: '60%'
        }
      });
    }
  



// Specific JS for Vendor Orders Page
var win = navigator.platform.indexOf('Win') > -1;
    if (win && document.querySelector('#sidenav-scrollbar')) {
      var options = {
        damping: '0.5'
      }
      Scrollbar.init(document.querySelector('#sidenav-scrollbar'), options);
    }

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Select All functionality
    document.getElementById('selectAll')?.addEventListener('change', function() {
      var checkboxes = document.querySelectorAll('input[name="orderCheck"]');
      checkboxes.forEach(function(checkbox) {
        checkbox.checked = this.checked;
      }, this);
    });
    
    // Logout helper
    function logout() {
      if (confirm('Sign out from Wahid Spare Hub?')) {
        window.location.href = 'logout.html';
      }
    }