// Nilai resistivitas pada suhu sekitar 20 derajat Celsius (ohm meter)
const MATERIALS = {
  copper: { name: "Tembaga", rho: 1.68e-8, muR: 1.0 },
  aluminum: { name: "Aluminium", rho: 2.82e-8, muR: 1.0 }
};

const $ = (id) => document.getElementById(id);
const fmt = (value, digits = 2) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);

let lossChart = null;
let skinChart = null;

function readLossInputs() {
  return {
    material: $("material").value,
    current: Number($("current").value),
    length: Number($("length").value),
    area: Number($("area").value),
    voltage: Number($("voltage").value),
    hours: Number($("hours").value)
  };
}

function calculateLoss() {
  const data = readLossInputs();
  const rho = MATERIALS[data.material].rho;
  const areaM2 = data.area * 1e-6; // mm² ke m²
  const resistance = rho * data.length / areaM2;
  const powerLoss = data.current ** 2 * resistance;
  const voltageDrop = data.current * resistance;
  const energyKWh = powerLoss * data.hours / 1000;
  const dropPercent = voltageDrop / data.voltage * 100;

  $("current-output").textContent = `${data.current} A`;
  $("length-output").textContent = `${data.length} m`;
  $("area-output").textContent = `${data.area} mm²`;
  $("voltage-output").textContent = `${data.voltage} V`;
  $("hours-output").textContent = `${data.hours} jam`;

  $("resistance-result").textContent = `${fmt(resistance, 4)} Ω`;
  $("loss-result").textContent = `${fmt(powerLoss, 2)} W`;
  $("drop-result").textContent = `${fmt(voltageDrop, 3)} V`;
  $("energy-result").textContent = `${fmt(energyKWh, 3)} kWh`;

  $("loss-explanation").textContent =
    `Dengan kabel ${MATERIALS[data.material].name} ${data.area} mm² sepanjang ${data.length} m dan arus ${data.current} A, model dasar menghasilkan rugi daya ${fmt(powerLoss, 2)} W. Penurunan tegangan sebesar ${fmt(dropPercent, 2)}% dari tegangan sumber ${data.voltage} V. Angka ini adalah perkiraan resistif pada suhu referensi, bukan penilaian kemampuan hantar arus kabel.`;

  updateLossChart(resistance);
}

function updateLossChart(resistance) {
  const currents = [0, 20, 40, 60, 80, 100];
  const values = currents.map(current => current * current * resistance);
  if (!lossChart) {
    const ctx = $("lossChart").getContext("2d");
    lossChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: currents,
        datasets: [{
          label: "Rugi daya (W)",
          data: values,
          borderColor: "#54e0cf",
          backgroundColor: "rgba(84,224,207,0.13)",
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: chartOptions("Arus (A)", "Rugi daya (W)")
    });
  } else {
    lossChart.data.datasets[0].data = values;
    lossChart.update();
  }
}

function readSkinInputs() {
  return {
    material: $("skin-material").value,
    frequency: Number($("frequency").value),
    radius: Number($("radius").value),
    current: Number($("ac-current").value)
  };
}

function calculateSkin() {
  const data = readSkinInputs();
  const material = MATERIALS[data.material];
  const mu0 = 4 * Math.PI * 1e-7;
  const mu = mu0 * material.muR;
  const omega = 2 * Math.PI * data.frequency;
  const delta = Math.sqrt(2 * material.rho / (omega * mu));
  const deltaMm = delta * 1000;
  const ratio = data.radius / deltaMm;

  $("frequency-output").textContent =
    data.frequency >= 1000
      ? `${fmt(data.frequency / 1000, 1)} kHz`
      : `${data.frequency} Hz`;
  $("radius-output").textContent = `${data.radius} mm`;
  $("ac-current-output").textContent = `${data.current} A`;
  $("skin-depth-result").textContent =
    deltaMm >= 100 ? `${fmt(deltaMm, 1)} mm` : `${fmt(deltaMm, 3)} mm`;
  $("ratio-result").textContent = fmt(ratio, 2);

  let regime;
  let explanation;
  if (ratio < 0.5) {
    regime = "Efek relatif kecil";
    explanation = "Radius konduktor jauh lebih kecil daripada beberapa skin depth. Distribusi arus cenderung lebih merata dibandingkan kondisi frekuensi tinggi.";
  } else if (ratio < 3) {
    regime = "Efek mulai terlihat";
    explanation = "Radius konduktor sebanding dengan skin depth. Distribusi arus mulai lebih terkonsentrasi di dekat permukaan.";
  } else {
    regime = "Efek signifikan";
    explanation = "Radius konduktor beberapa kali lebih besar daripada skin depth. Arus AC cenderung lebih terkonsentrasi di lapisan dekat permukaan.";
  }

  $("skin-regime").textContent = regime;
  $("skin-explanation").textContent =
    `${explanation} Untuk ${material.name} pada ${data.frequency} Hz, skin depth perkiraan adalah ${fmt(deltaMm, 3)} mm. Diagram adalah ilustrasi konsep, bukan distribusi medan yang dihitung secara numerik.`;

  // Mengubah ukuran lingkaran bagian dalam secara ilustratif saja.
  const innerRadius = Math.max(8, Math.min(78, 83 * Math.exp(-ratio * 0.35)));
  $("core-circle").setAttribute("r", innerRadius.toFixed(1));
  $("core-label").setAttribute("opacity", innerRadius < 24 ? "0" : "1");

  updateSkinChart(data.material, data.frequency);
}

function updateSkinChart(materialKey, selectedFrequency) {
  const material = MATERIALS[materialKey];
  const mu = 4 * Math.PI * 1e-7 * material.muR;
  const frequencies = [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
  const values = frequencies.map(f =>
    Math.sqrt(2 * material.rho / (2 * Math.PI * f * mu)) * 1000
  );

  if (!skinChart) {
    const ctx = $("skinChart").getContext("2d");
    skinChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: frequencies,
        datasets: [{
          label: "Skin depth (mm)",
          data: values,
          borderColor: "#ffb36b",
          backgroundColor: "rgba(255,179,107,0.12)",
          fill: true,
          tension: 0.2,
          pointRadius: 3
        }]
      },
      options: {
        ...chartOptions("Frekuensi (Hz)", "Skin depth (mm)"),
        scales: {
          x: {
            type: "logarithmic",
            ticks: { color: "#9aaac2" },
            grid: { color: "rgba(154,170,194,.12)" },
            title: { display: true, text: "Frekuensi (Hz)", color: "#9aaac2" }
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#9aaac2" },
            grid: { color: "rgba(154,170,194,.12)" },
            title: { display: true, text: "Skin depth (mm)", color: "#9aaac2" }
          }
        }
      }
    });
  } else {
    skinChart.data.datasets[0].data = values;
    skinChart.update();
  }
}

function chartOptions(xTitle, yTitle) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#dbe8f8", usePointStyle: true } },
      tooltip: { mode: "index", intersect: false }
    },
    scales: {
      x: {
        ticks: { color: "#9aaac2" },
        grid: { color: "rgba(154,170,194,.12)" },
        title: { display: true, text: xTitle, color: "#9aaac2" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#9aaac2" },
        grid: { color: "rgba(154,170,194,.12)" },
        title: { display: true, text: yTitle, color: "#9aaac2" }
      }
    }
  };
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
      document.querySelectorAll(".page-section").forEach(section => section.classList.add("hidden"));
      button.classList.add("active");
      $(button.dataset.target).classList.remove("hidden");
      if (button.dataset.target === "skin-section" && skinChart) skinChart.resize();
      if (button.dataset.target === "loss-section" && lossChart) lossChart.resize();
    });
  });
}

function setupEvents() {
  ["material", "current", "length", "area", "voltage", "hours"].forEach(id => {
    $(id).addEventListener("input", calculateLoss);
    $(id).addEventListener("change", calculateLoss);
  });
  ["skin-material", "frequency", "radius", "ac-current"].forEach(id => {
    $(id).addEventListener("input", calculateSkin);
    $(id).addEventListener("change", calculateSkin);
  });

  $("reset-loss").addEventListener("click", () => {
    $("material").value = "copper";
    $("current").value = 20;
    $("length").value = 100;
    $("area").value = 10;
    $("voltage").value = 230;
    $("hours").value = 8;
    calculateLoss();
  });

  setupTabs();
}

setupEvents();
calculateLoss();
calculateSkin();
